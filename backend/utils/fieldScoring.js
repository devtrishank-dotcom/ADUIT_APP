// Per-field compliance scoring.
//
// The audit templates are almost entirely Yes/No compliance questions, so the
// score for a field answers one question: how badly did the audited entity fail
// it? A score of 0 is fully compliant, 100 is a total failure. Fields that carry
// no compliance meaning (labels, free-text notes) score null so the UI can leave
// them uncoloured rather than implying a verdict.
// Standalone numeric fields only carry a verdict when the field name says it is
// a recovery or percentage figure. A generic amount is just data.
const RECOVERY_COLUMN = /PCT|RECOV|PERCENTAGE|RATE|SCORE/i;

// Recovery below this share of demand is treated as a serious shortfall.
const RECOVERY_GOOD = 90;
const RECOVERY_WARN = 70;

const NON_COMPLIANT = /NOT[_\s-]?COMPLIED|NO[_\s-]?RECOVERY|NO[_\s-]?PROGRESS|DEVIATION|PENDING|PARTIALLY[_\s-]?COMPLIED|NON[_\s-]?COMPLIANT|DEFICIENT|IRREGULAR|OVERDUE|LOSS|NEGATIVE/i;
const PARTIAL = /PARTIALLY[_\s-]?COMPLIED|NON[_\s-]?COMPLIANT|PARTIAL|DEVIATION|PENDING/i;

const bandFor = (score) => {
  if (score == null) return null;
  if (score >= 70) return 'Red';
  if (score >= 40) return 'Yellow';
  return 'Green';
};

// Yes/No compliance questions: "No" is a full failure, "Yes" a clean pass.
const scoreYesNo = (value) => {
  if (value === false || value === 0) return 100;
  if (value === true || value === 1) return 0;
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (/^(NO|N|NOPE|FALSE)$/i.test(text)) return 100;
  if (/^(YES|Y|TRUE|OK)$/i.test(text)) return 0;
  if (PARTIAL.test(text)) return 50;
  return null;
};

// Compliance-status dropdowns carry their own riskPoints, so prefer those when
// the template wired the field to an option list.
const scoreOptionValue = (value, options) => {
  const list = Array.isArray(options) ? options : [];
  if (Array.isArray(value)) {
    const worst = value
      .map((v) => scoreOptionValue(v, list))
      .filter((s) => s != null)
      .reduce((max, s) => (s > max ? s : max), 0);
    return value.length ? worst : null;
  }

  const match = list.find((o) => String(o.value) === String(value));
  if (match && typeof match.riskPoints === 'number') {
    // riskPoints runs 0..8 across the standard severity list; scale it to 0..100.
    return Math.min(100, Math.round((match.riskPoints / 8) * 100));
  }

  const text = String(value ?? '').trim();
  if (!text) return null;
  if (/NOT[_\s-]?COMPLIED/i.test(text)) return 100;
  if (PARTIAL.test(text)) return 50;
  if (/(NOT[_\s-]?APPLICABLE|N\/A|NONE|NA)/i.test(text)) return null;
  if (/COMPLIED|COMPLIANT/i.test(text)) return 0;
  return null;
};

// Numeric fields: only recovery and demand-shortfall figures carry a verdict.
// A generic amount with no ratio attached is just data, so it stays uncoloured.
const scoreNumeric = (value, fieldCode) => {
  const num = Number(value);
  if (value == null || value === '' || Number.isNaN(num)) return null;
  const code = String(fieldCode || '');

  if (RECOVERY_COLUMN.test(code)) {
    if (num >= RECOVERY_GOOD) return 0;
    if (num >= RECOVERY_WARN) return 40;
    if (num >= 40) return 65;
    return 100;
  }
  return null;
};

// Recovery grids are scored on their worst recovery-vs-demand ratio so a single
// bad row stays visible instead of being averaged away by healthy rows. Column
// codes are listed explicitly, most specific first: the recovery grids carry
// both a "current" and a "total" column, and picking the first match would
// divide interest recovery by total demand.
const RECOVERY_COLUMNS = ['COL_RECOV_TOTAL', 'COL_RECOVERED', 'COL_RECOV', 'COL_RECOVERY'];
const DEMAND_COLUMNS = ['COL_DEMAND_TOTAL', 'COL_DEMAND', 'COL_DEMAND_OS'];
const PERCENT_COLUMN = /^COL_PCT/i;

const pickNumber = (row, names) => {
  const key = Object.keys(row || {}).find((k) => names.includes(k.toUpperCase()));
  if (key == null) return NaN;
  return Number(row[key]);
};

const scoreGrid = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const scores = [];

  rows.forEach((row) => {
    const recovered = pickNumber(row, RECOVERY_COLUMNS);
    const demand = pickNumber(row, DEMAND_COLUMNS);
    if (Number.isFinite(recovered) && Number.isFinite(demand) && demand > 0) {
      scores.push(scoreNumeric(Math.round((recovered / demand) * 100), 'RECOVERY'));
    }
  });

  if (scores.length) return Math.max(...scores);

  // No demand/recovery pair in this grid, so fall back to any explicit
  // recovery-percentage column it carries.
  const pcts = rows.flatMap((row) =>
    Object.entries(row || {})
      .filter(([k, v]) => PERCENT_COLUMN.test(k) && v !== '' && v != null && Number.isFinite(Number(v)))
      .map(([, v]) => Number(v))
  );
  if (pcts.length) return scoreNumeric(Math.min(...pcts), 'RECOVERY');
  return null;
};

// The single entry point used by the API to build riskScore.fieldScores.
const scoreField = (field, value) => {
  const type = field.fieldType || field.type;

  switch (type) {
    case 'RADIO_YN':
      return scoreYesNo(value);
    case 'DROPDOWN':
    case 'MULTI_SELECT':
    case 'CHECKBOX_GROUP':
      return scoreOptionValue(value, field.options);
    case 'NUMBER':
    case 'CURRENCY':
    case 'PERCENTAGE':
      return scoreNumeric(value, field.code);
    case 'GRID':
      return scoreGrid(value);
    case 'SIGNATURE':
      return value ? 0 : null;
    default:
      // Free text and dates are evidence, not verdicts. A blank mandatory field
      // is still worth flagging because it blocks submission.
      if (value == null || value === '') {
        return field.isMandatory ?? field.mandatory ? 40 : null;
      }
      return null;
  }
};

// Walks a template and returns { fieldScores, fieldBands, sectionScores }.
const scoreTemplate = (template, responses = []) => {
  // Grid cells are stored one response per cell with a row index, so only
  // whole-field responses (row index absent or -1) describe a field's value.
  const byField = new Map();
  responses.forEach((r) => {
    const rowIndex = r.gridRowIndex;
    const isCell = rowIndex != null && rowIndex >= 0;
    if (r.fieldCode && !isCell) byField.set(r.fieldCode, r);
  });

  const fieldScores = {};
  const fieldBands = {};
  const sectionScores = [];
  let overall = 0;
  let scoredSections = 0;

  (template?.sections || []).forEach((section) => {
    let sectionTotal = 0;
    let sectionCount = 0;

    (section.fields || []).forEach((field) => {
      const response = byField.get(field.code);
      const value = response ? response.value : undefined;
      const score = scoreField(field, value);
      if (score != null) {
        fieldScores[field.code] = score;
        fieldBands[field.code] = bandFor(score);
        sectionTotal += score;
        sectionCount += 1;
      }
    });

    // A section with nothing to judge (identity blocks, pure narrative) must
    // not count as a clean pass, otherwise it drags the overall score down.
    if (!sectionCount) return;

    const average = Math.round(sectionTotal / sectionCount);
    sectionScores.push({ section: section.code, score: average, band: bandFor(average) });
    overall += average;
    scoredSections += 1;
  });

  const overallScore = scoredSections ? Math.round(overall / scoredSections) : 0;

  return {
    overallScore,
    band: bandFor(overallScore) || 'Green',
    fieldScores,
    fieldBands,
    sectionScores,
  };
};

module.exports = {
  scoreField,
  scoreTemplate,
  scoreYesNo,
  scoreOptionValue,
  scoreNumeric,
  scoreGrid,
  bandFor,
};