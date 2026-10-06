// Fill the audit response forms with realistic demo data.
//
// Both audit templates are almost entirely Yes/No compliance questions, so the
// red / yellow / green banding in the form comes from those answers plus the
// recovery grids. Each instance is given a different profile so opening a
// different audit shows a different sheet instead of the same tinted form.
//
//   node seeds/demo-form-responses.seed.js
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const AuditInstance = require('../models/AuditInstance');
const AuditResponse = require('../models/AuditResponse');
const { scoreTemplate } = require('../utils/fieldScoring');

// How well each audit went. `red` is the number of Yes/No questions answered
// "No"; they are spread across the whole template so the sheet looks uneven, as
// a real one is.
//
// Yellow needs a separate lever. A Yes/No question cannot express "partly
// complied", and answering "No" is a straight red, so amber comes from the two
// things that genuinely sit in the middle: `blank` mandatory evidence fields the
// auditor could not produce, and recovery grids landing in the 40-70% band.
const PROFILES = [
  {
    key: 'healthy',
    red: 2,
    blank: 4,
    recovery: [96, 92, 98, 94, 90],
    remarks: [
      'Recovered as per recovery schedule',
      'Recovered on time',
      'Recovered as per schedule',
      'Recovered on time',
      'Recovered as per recovery schedule',
    ],
    adverseRemarks: {},
  },
  {
    key: 'healthy',
    red: 3,
    blank: 6,
    recovery: [91, 88, 95, 90, 86],
    remarks: [
      'Recovered as per schedule',
      'Slight delay, recovered in the following month',
      'Recovered as per schedule',
      'Recovered on time',
      'Recovered as per schedule',
    ],
    adverseRemarks: {
      'FLD_MD_SEPARATE_OFFICE': 'Not complied. Society office is shared with the Talati office.',
    },
  },
  {
    key: 'mixed',
    red: 14,
    blank: 10,
    recovery: [74, 62, 88, 45, 70],
    remarks: [
      'Shortfall of Rs. 5.20 lakh against target',
      'Partially recovered; follow-up scheduled',
      'Recovered as per schedule',
      'Major shortfall, account under follow-up',
      'Recovered up to 70% only',
    ],
    adverseRemarks: {
      'FLD_MD_SEPARATE_OFFICE': 'Not complied. Society office is shared with the Talati office.',
      'FLD_MD_SHARE_CERT': 'Share certificates were not issued to 38 members.',
      'FLD_MD_AGM': 'Partially complied. AGM held but minutes not recorded.',
    },
  },
  {
    key: 'poor',
    red: 40,
    blank: 26,
    recovery: [41, 28, 55, 19, 33],
    remarks: [
      'Severe shortfall; account likely to become NPA',
      'NPA risk. No recovery despite notices',
      'Below target by a wide margin',
      'Severe shortfall; arbitration not initiated',
      'Recovery stalled since February 2025',
    ],
    adverseRemarks: {
      'FLD_MD_SEPARATE_OFFICE': 'Not complied. Society office is shared with the Talati office.',
      'FLD_MD_SHARE_CERT': 'Share certificates were not issued to 96 members.',
      'FLD_MD_AGM': 'Not complied. AGM not held during the year.',
      'FLD_MD_MEMBER_REG': 'Not complied. Member register is not updated and has no Aadhaar entries.',
      'FLD_MD_LOAN_STMT': 'Not complied. Loan statements were not furnished for verification.',
      'FLD_MD_RECOVERY_SHEET': 'Not complied. Recovery sheet not maintained by the society.',
      'FLD_MD_OUTSTANDING_STMT': 'Partially complied. Outstanding statement provided for one crop year only.',
    },
  },
];

// Recovery percentages per receivable type, scaled by the profile so a poor
// audit really does show poor numbers in the grids.
const RECEIVABLE_TYPES = [
  'Crop Loan',
  'Gold Loan',
  'Cash Credit',
  'Medium Term Loan',
  'KCC Short Term',
];

const buildRecoveryGrid = (profile) =>
  RECEIVABLE_TYPES.map((type, i) => {
    const pct = profile.recovery[i % profile.recovery.length];
    const demandTotal = [1200000, 860000, 540000, 730000, 410000][i % 5];
    const recoveredTotal = Math.round((demandTotal * pct) / 100);
    // Interest (current) is recovered ahead of principal in most societies, so
    // the current leg always clears first.
    const demandCurrent = Math.round(demandTotal * 0.08);
    const recoveredCurrent = demandCurrent;
    const demandPrin = demandTotal - demandCurrent;
    const recoveredPrin = Math.max(0, recoveredTotal - recoveredCurrent);

    return {
      COL_SR: i + 1,
      COL_LOAN_TYPE: type,
      COL_RECV_TYPE: type,
      COL_DEMAND_CURRENT: demandCurrent,
      COL_DEMAND_PRIN: demandPrin,
      COL_DEMAND_TOTAL: demandTotal,
      COL_RECOV_CURRENT: recoveredCurrent,
      COL_RECOV_PRIN: recoveredPrin,
      COL_RECOV_TOTAL: recoveredTotal,
      COL_PCT_CURRENT: 100,
      COL_PCT_PRIN: Math.round((recoveredPrin / demandPrin) * 100) || 0,
      COL_PCT_TOTAL: pct,
      COL_DEMAND: demandTotal,
      COL_RECOVERED: recoveredTotal,
      COL_PCT: pct,
      COL_SHARE: ['21.4', '15.3', '9.6', '13.0', '7.3'][i % 5],
      REMARKS: profile.remarks[i % profile.remarks.length],
    };
  });

// Grids that are pure registers or tallies: no compliance ratio, but they still
// need believable content so the form does not look half-finished.
const buildRegisterGrid = (field, profile) => {
  const columns = (field.gridColumns || []).map((c) => c.code || c.columnCode);
  const poor = profile.key === 'poor';

  const content = {
    FLD_MD_STOCK_SILAK_GRID: [
      ['Golden Jubilee Stock', '2025-07-02', 'Verified'],
      ['Crop Loan Register', '2025-07-04', 'Verified'],
      ['KCC Register', '2025-07-04', poor ? 'Entries missing for March 2025' : 'Verified'],
      ['Cash Book', '2025-07-05', 'Verified'],
    ],
    FLD_MD_MEMBER_GRID: [
      [1, 'Share Capital Members', 412, 268, 184000, 596000],
      [2, 'Loan Account Holders', 688, 501, 421000, 922000],
      [3, 'Deposit Members', 305, 190, 96000, 286000],
    ],
    FLD_MD_SHARE_CAPITAL_GRID: [
      ['Ordinary Shares', 1500000, 940000, 12000, 928000],
      ['Member Admission Fee', 0, 0, 0, 0],
      ['Reserve & Surplus', 0, 0, 0, 0],
    ],
    FLD_MD_MEMBER_MOVEMENT_GRID: [
      ['Opening 01-04-2025', 405, 262, 178000, 580000],
      ['Additions during year', 34, 21, 42000, 63000],
      ['Deletions during year', 27, 15, 36000, 47000],
      ['Closing 31-03-2026', 412, 268, 184000, 596000],
    ],
    FLD_MD_SHARES_PURCH_GRID: [
      [1, 'Junagadh District Co-op Bank', 'Ordinary', 500, 10, 5000, '2024-25', 500, ''],
      [2, 'Girnar Nagarik Sahakari Bank', 'Ordinary', 250, 10, 2500, '2024-25', 250, ''],
      [3, 'Gujarat State Co-op Federation', 'Special', 100, 100, 10000, '2023-24', 0, poor ? 'Dividend declared but not received for two years' : ''],
    ],
    FLD_MD_AGREEMENT_GRID: [
      [1, 'Loan agreement with borrower', 688, 501],
      [2, 'Voucher signature register', 688, 501],
      [3, 'Hypothecation register', 305, 190],
    ],
    FLD_MD_OVERDUE_RECOVERY_GRID: [
      [1, 'Crop Loan', 46, 512000, 22, 244000, 9, 187000, 6, 71000, 12, 96000],
      [2, 'KCC Short Term', 31, 288000, 17, 156000, 5, 74000, 4, 38000, 8, 51000],
      [3, 'Medium Term Loan', 12, 194000, 6, 88000, 2, 31000, 2, 14000, 3, 26000],
    ],
    FLD_IM_DENOM_GRID: [
      ['Rs. 2000', 14, 28000],
      ['Rs. 500', 62, 31000],
      ['Rs. 200', 148, 29600],
      ['Rs. 100', 316, 31600],
      ['Rs. 50', 522, 26100],
      ['Rs. 20', 640, 12800],
      ['Total', null, 159100],
    ],
    FLD_IM_REGISTERS_GRID: [
      [1, 'Cash Book', 'Complete'],
      [2, 'Day Book', 'Complete'],
      [3, 'Loan Register', poor ? 'Incomplete for March 2026' : 'Complete'],
      [4, 'Stock Register', 'Complete'],
      [5, 'Share Register', 'Complete'],
    ],
    FLD_IM_SOC_PROP_CARDS_GRID: [
      [1, 'Junagadh Taluka Sahakari Union', 24, 21, 3, 'Yes', poor ? '3 societies pending for over a year' : 'Followed up'],
      [2, 'Girnar Kisan Sahakari Mandali', 18, 18, 0, 'Yes', 'Complete'],
      [3, 'Kothariya Primary Society', 12, 8, 4, 'No', poor ? 'Gram Sevak not appointed' : 'Under process'],
    ],
  };

  const rows = content[field.code] || [];
  return rows.map((cells, idx) => {
    const row = {};
    columns.forEach((code, i) => {
      row[code] = cells[i] == null ? '' : cells[i];
    });
    row._key = `seed_${idx}`;
    return row;
  });
};

// Spreads `count` picks evenly across `total` items, so failures land in
// different sections on each run instead of clustering at the top.
const spread = (total, count, skip = new Set()) => {
  const picks = [];
  if (total === 0 || count <= 0) return picks;
  const step = total / Math.min(count, total);
  for (let i = 0; i < count && picks.length < total; i += 1) {
    const idx = Math.min(total - 1, Math.floor(i * step + 1));
    if (skip.has(idx) && picks.length + 1 < total) {
      picks.push(Math.min(total - 1, idx + 1));
    } else {
      picks.push(idx);
    }
  }
  return Array.from(new Set(picks)).filter((i) => i < total);
};

const DATE_ANSWERS = {
  MD_YADI_DATE: '2025-07-21T00:00:00.000Z',
  REG_DATE: '2019-04-11T00:00:00.000Z',
  PROP_CARD_DATE: '2025-07-18T00:00:00.000Z',
  REPORT_SEND_DATE: '2025-08-05T00:00:00.000Z',
  RECT_REPORT_DATE: '2025-09-10T00:00:00.000Z',
  INSPECTION_FROM_DATE: '2025-07-21T00:00:00.000Z',
  INSPECTION_TO_DATE: '2025-08-02T00:00:00.000Z',
  MEETING_DATE: '2025-08-28T00:00:00.000Z',
  LAST_AUDIT_DATE: '2025-06-30T00:00:00.000Z',
};

const TEXT_ANSWERS = {
  SOC_NAME: 'શ્રી કોઠારિયા પ્રાથમિક સહકારી સમાજ',
  WORK_VILLAGE: 'કોઠારિયા',
  TALUKA: 'Junagadh',
  VILLAGE: 'Kothariya, Malia Hatina, Bhanvad, Agatrai',
  OFFICER_NAME: 'R. A. Desai',
  OFFICER_DESG: 'Assistant Manager',
  SECRETARY_NAME: 'N. B. Patel',
  PRESIDENT_NAME: 'D. K. Vala',
  REG_NO: 'JJS/M-001',
  AUDIT_CLASS: 'Class II - 12/08/2025',
  AUDIT_PERIOD: '01-04-2025 to 31-03-2026',
  BRANCH_NAME: 'Junagadh Main Branch',
  IFSC: 'JJSB0000642',
  PHONE: '02876 224455',
  EMAIL: 'kothariya@jjsbank.in',
  ADDRESS: 'Village Kothariya, Taluka Junagadh, Dist Junagadh 362010',
};

const pickAnswer = (code, profile) => {
  const adverse = profile.adverseRemarks[code];
  if (adverse) return adverse;

  if (/SOC_NAME/.test(code)) return TEXT_ANSWERS.SOC_NAME;
  if (/WORK_VILLAGE/.test(code)) return TEXT_ANSWERS.WORK_VILLAGE;
  if (/TALUKA/.test(code)) return TEXT_ANSWERS.TALUKA;
  if (/VILLAGE/.test(code)) return TEXT_ANSWERS.VILLAGE;
  if (/REG_NO/.test(code)) return TEXT_ANSWERS.REG_NO;
  if (/IFSC/.test(code)) return TEXT_ANSWERS.IFSC;
  if (/PHONE|MOBILE/.test(code)) return TEXT_ANSWERS.PHONE;
  if (/EMAIL/.test(code)) return TEXT_ANSWERS.EMAIL;
  if (/ADDRESS/.test(code)) return TEXT_ANSWERS.ADDRESS;
  if (/AUDIT_CLASS/.test(code)) return TEXT_ANSWERS.AUDIT_CLASS;
  if (/AUDIT_PERIOD/.test(code)) return TEXT_ANSWERS.AUDIT_PERIOD;
  if (/OFFICER_NAME/.test(code)) return TEXT_ANSWERS.OFFICER_NAME;
  if (/SECRETARY/.test(code)) return TEXT_ANSWERS.SECRETARY_NAME;
  if (/PRESIDENT/.test(code)) return TEXT_ANSWERS.PRESIDENT_NAME;
  if (/OFFICER_DESG|DESIGNATION|DESG/.test(code)) return TEXT_ANSWERS.OFFICER_DESG;
  if (/BRANCH_NAME/.test(code)) return TEXT_ANSWERS.BRANCH_NAME;

  return profile.key === 'poor'
    ? 'Record not available for verification during the inspection.'
    : 'Verified against the register and found correct.';
};

const pickDate = (code) => {
  const key = Object.keys(DATE_ANSWERS).find((k) => code.includes(k));
  return key ? DATE_ANSWERS[key] : '2025-07-28T00:00:00.000Z';
};

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  const instances = await AuditInstance.find({}).sort({ createdAt: 1 });
  console.log(`Found ${instances.length} audit instances.`);

  let total = 0;
  for (let i = 0; i < instances.length; i += 1) {
    const instance = instances[i];
    const profile = PROFILES[i] || PROFILES[0];

    const template = await mongoose.connection.db
      .collection('templates')
      .findOne({ _id: new mongoose.Types.ObjectId(String(instance.template)) });

    if (!template) {
      console.log(`  ${instance._id}: no template, skipped`);
      continue;
    }

    // Flatten every Yes/No question so failures can be spread across the whole
    // template rather than bunched into one section.
    const yesNoFields = [];
    const evidenceFields = [];
    (template.sections || []).forEach((section) => {
      (section.fields || []).forEach((field) => {
        const type = field.fieldType || field.type;
        if (type === 'RADIO_YN') {
          yesNoFields.push({ section, field });
          return;
        }
        // Mandatory free-text and date fields are the evidence the auditor has to
        // produce. Leaving some of them blank is what puts them in the amber band.
        const isMandatory = field.isMandatory ?? field.mandatory;
        if (isMandatory && ['TEXT_SHORT', 'TEXT_LONG', 'DATE', 'DATE_RANGE'].includes(type)) {
          evidenceFields.push({ section, field });
        }
      });
    });

    const redAt = new Set(spread(yesNoFields.length, profile.red));
    const blankAt = new Set(spread(evidenceFields.length, profile.blank));

    const docs = [];
    let yesNoIndex = 0;
    let evidenceIndex = 0;

    (template.sections || []).forEach((section) => {
      (section.fields || []).forEach((field) => {
        const type = field.fieldType || field.type;
        const base = { auditInstance: instance._id, sectionCode: section.code, fieldCode: field.code };

        if (type === 'RADIO_YN') {
          const at = yesNoIndex;
          yesNoIndex += 1;
          // Yes/No answers store real booleans, which is what scoreYesNo reads.
          docs.push({ ...base, value: !redAt.has(at) });
          return;
        }

        if (type === 'GRID') {
          const isRecovery = /RECOVERY/i.test(field.code);
          const rows = isRecovery ? buildRecoveryGrid(profile) : buildRegisterGrid(field, profile);
          docs.push({ ...base, value: rows });
          return;
        }

        const isMandatory = field.isMandatory ?? field.mandatory;
        if (
          evidenceIndex < evidenceFields.length &&
          blankAt.has(evidenceIndex) &&
          isMandatory &&
          ['TEXT_SHORT', 'TEXT_LONG', 'DATE', 'DATE_RANGE'].includes(type)
        ) {
          evidenceIndex += 1;
          docs.push({ ...base, value: '' });
          return;
        }
        if (['TEXT_SHORT', 'TEXT_LONG', 'DATE', 'DATE_RANGE'].includes(type)) evidenceIndex += 1;

        if (type === 'DATE' || type === 'DATE_RANGE') {
          docs.push({ ...base, value: pickDate(field.code) });
          return;
        }

        if (type === 'SIGNATURE') {
          docs.push({ ...base, value: { signedAt: '2025-08-02T10:30:00.000Z' } });
          return;
        }

        if (type === 'CURRENCY' || type === 'NUMBER' || type === 'PERCENTAGE') {
          docs.push({ ...base, value: profile.recovery[0] });
          return;
        }

        docs.push({ ...base, value: pickAnswer(field.code, profile) });
      });
    });

    await AuditResponse.deleteMany({ auditInstance: instance._id });
    await AuditResponse.insertMany(docs);
    total += docs.length;

    const scored = scoreTemplate(template, docs);
    instance.overallRiskScore = scored.overallScore;
    instance.overallRiskBand = scored.band;
    if (['Draft', 'InProgress'].includes(instance.status)) instance.status = 'Submitted';
    instance.submittedAt = instance.submittedAt || new Date('2025-08-04T11:00:00.000Z');
    instance.startDate = instance.startDate || new Date('2025-07-21T00:00:00.000Z');
    instance.endDate = instance.endDate || new Date('2025-08-02T00:00:00.000Z');
    await instance.save();

    const bands = Object.values(scored.fieldBands);
    const count = (b) => bands.filter((x) => x === b).length;

    console.log(
      `  ${String(instance.auditType).slice(-4)}  ${profile.key.padEnd(8)} ` +
        `responses=${String(docs.length).padEnd(4)} overall=${String(scored.overallScore).padEnd(3)} ` +
        `(${scored.band})  red=${count('Red')} yellow=${count('Yellow')} green=${count('Green')} scored=${bands.length}`
    );
  }

  console.log(`\nInserted ${total} responses.`);
  await mongoose.disconnect();
  console.log('DONE');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});