import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import { BANK, getLogoDataUrl, addPdfHeader, drawCompactHeader, addPdfFooter } from './branding';
import { normalizeTemplate, evaluateVisibility } from './normalizeTemplate';

const MARGIN = 14;
const HEADER_H = 26;
const FOOTER_H = 14;

const fmtDate = (v) => (v ? dayjs(v).format('DD/MM/YYYY') : '-');
const fmtDateTime = (v) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '-');

const optionLabel = (field, value) => {
  const opts = field.options || [];
  const found = opts.find((o) => String(o.value) === String(value));
  return found ? (found.label || found.labelEn || found.value) : value;
};

const formatCell = (col, raw) => {
  if (raw === null || raw === undefined || raw === '') return '-';
  switch (col.type) {
    case 'DATE': return fmtDate(raw);
    case 'CURRENCY': return `INR ${Number(raw).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'PERCENTAGE': return `${raw}%`;
    case 'DROPDOWN': return String(optionLabel(col, raw));
    default: return String(raw);
  }
};

export const formatFieldValue = (field, value) => {
  if (value === null || value === undefined || value === '') return '-';
  switch (field.type) {
    case 'RADIO_YN':
      if (value === true || value === 'true') return 'Yes';
      if (value === false || value === 'false') return 'No';
      return 'Yes';
    case 'DATE': return fmtDate(value);
    case 'DATE_RANGE':
      return Array.isArray(value) && value.length === 2
        ? `${fmtDate(value[0])} - ${fmtDate(value[1])}` : '-';
    case 'CURRENCY':
      return `INR ${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'PERCENTAGE': return `${value}%`;
    case 'MULTI_SELECT':
    case 'CHECKBOX_GROUP':
      return (Array.isArray(value) ? value : [value]).map((v) => optionLabel(field, v)).join(', ') || '-';
    case 'DROPDOWN': return String(optionLabel(field, value));
    case 'FILE_ATTACH': {
      const files = Array.isArray(value) ? value : [value];
      const names = files.map((f) => (f && (f.name || f.fileName)) || '').filter(Boolean);
      return names.length ? names.join(', ') : '-';
    }
    case 'SIGNATURE':
      if (value && typeof value === 'object' && value.signedAt) return `Signed on ${fmtDateTime(value.signedAt)}`;
      return value ? 'Signed' : '-';
    default: return String(value);
  }
};

export async function buildAuditReportPdf({
  instance,
  template,
  responses = {},
  riskScore,
  observations = [],
  attachments = [],
  workflowHistory = [],
  optionLists = [],
}) {
  const logo = await getLogoDataUrl();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const headerPages = new Set();
  const footerPages = new Set();

  const hooks = () => ({
    margin: { left: MARGIN, right: MARGIN, top: HEADER_H, bottom: FOOTER_H },
    willDrawPage: () => {
      const page = doc.internal.getNumberOfPages();
      if (headerPages.has(page)) return;
      headerPages.add(page);
      drawCompactHeader(doc, logo, MARGIN);
    },
    didDrawPage: () => {
      const page = doc.internal.getNumberOfPages();
      if (footerPages.has(page)) return;
      footerPages.add(page);
      addPdfFooter(doc);
    },
  });

  const title = instance?.auditType ? `${instance.auditType} - Audit Report` : 'Audit Report';
  const subtitleParts = [
    instance?.entityName,
    instance?.financialYear ? `FY ${instance.financialYear}` : null,
    instance?.status ? `Status: ${instance.status}` : null,
    `Generated: ${fmtDateTime(new Date())}`,
  ].filter(Boolean);

  const startY = await addPdfHeader(doc, {
    title,
    subtitle: subtitleParts.join('  |  '),
  });
  headerPages.add(1);

  // 1) Audit information
  autoTable(doc, {
    startY,
    head: [],
    body: [
      ['Entity Name', instance?.entityName || '-'],
      ['Entity Type', instance?.entityType || '-'],
      ['Audit Type', instance?.auditType || '-'],
      ['Status', instance?.status || '-'],
      ['Auditor', instance?.assignedToName || instance?.auditorName || '-'],
      ['Financial Year', instance?.financialYear || '-'],
      ['Start Date', fmtDate(instance?.startDate)],
      ['End Date', fmtDate(instance?.endDate)],
      ['Last Updated', fmtDateTime(instance?.updatedAt)],
    ],
    theme: 'grid',
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold', textColor: BANK.primary, fillColor: [245, 247, 250] },
      1: { textColor: [30, 30, 30] },
    },
    styles: { fontSize: 9, cellPadding: 2.5, valign: 'top', overflow: 'linebreak' },
    ...hooks(),
  });

  // 2) Risk summary
  if (riskScore) {
    const band = riskScore.overallRiskBand || riskScore.riskBand || '-';
    const score = riskScore.overallScore ?? riskScore.overallRiskScore;
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 6,
      head: [],
      body: [[
        { content: 'Overall Risk Rating', fontStyle: 'bold', textColor: BANK.primary, fillColor: [245, 247, 250] },
        score != null ? `${band} (Score: ${score}%)` : String(band),
      ]],
      theme: 'grid',
      columnStyles: { 0: { cellWidth: 40 } },
      styles: { fontSize: 9, cellPadding: 2.5 },
      ...hooks(),
    });
  }

  // 3) Sections & fields
  const normalized = normalizeTemplate(template, optionLists);
  const sections = (normalized?.sections || []).filter((s) => (s.fields || []).length);

  const labelOf = (field) => {
    const label = field.label || field.labelEn || field.code;
    const risk = riskScore?.fieldScores?.[field.code];
    const prefix = field.mandatory ? '* ' : '';
    return risk != null ? `${prefix}${label}  [risk ${risk}%]` : `${prefix}${label}`;
  };

  sections.forEach((section) => {
    const sectionRisk = riskScore?.sectionScores?.[section.code]?.overallScore;
    const sectionTitle = `${section.title || section.titleEn || section.code}${sectionRisk != null ? `  (Risk ${sectionRisk}%)` : ''}`;
    const scalarRows = [];
    const gridFields = [];

    (section.fields || [])
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach((field) => {
        if (!evaluateVisibility(field.visibilityRule, responses)) return;
        if (field.type === 'GRID') {
          gridFields.push(field);
          return;
        }
        scalarRows.push([labelOf(field), formatFieldValue(field, responses?.[field.code])]);
      });

    if (scalarRows.length) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 6,
        head: [],
        body: [
          [{ content: sectionTitle, colSpan: 2, fontStyle: 'bold', fontSize: 10.5, textColor: BANK.primary, fillColor: [240, 244, 249], cellPadding: 3.5 }],
          ...scalarRows,
        ],
        theme: 'grid',
        columnStyles: {
          0: { cellWidth: 72, fontStyle: 'bold', textColor: [40, 40, 40], fillColor: [250, 251, 252] },
          1: { textColor: [30, 30, 30] },
        },
        styles: { fontSize: 9, cellPadding: 2.5, valign: 'top', overflow: 'linebreak' },
        ...hooks(),
      });
    }

    gridFields.forEach((field) => {
      const rows = Array.isArray(responses?.[field.code]) ? responses[field.code] : [];
      const columns = (field.gridColumns || []).map((c) => c.label || c.labelEn || c.title || c.code || c.key || 'Col');
      if (!columns.length) return;
      const colKeys = (field.gridColumns || []).map((c) => c.code || c.key);
      const body = rows.length
        ? rows.map((r) => columns.map((_, idx) => {
            const key = colKeys[idx];
            const col = (field.gridColumns || [])[idx];
            const raw = key ? r[key] : r[idx];
            return col ? formatCell(col, raw) : String(raw ?? '-');
          }))
        : [columns.map(() => '-')];

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 6,
        head: [columns],
        body: [
          [{ content: `${labelOf(field)}  (${rows.length} row${rows.length === 1 ? '' : 's'})`, colSpan: columns.length, fontStyle: 'bold', fontSize: 9.5, textColor: BANK.primary, fillColor: [244, 247, 240], cellPadding: 3 }],
          ...body,
        ],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, valign: 'top', overflow: 'linebreak' },
        headStyles: { fillColor: BANK.primary, textColor: 255, fontStyle: 'bold', fontSize: 8 },
        ...hooks(),
      });
    });
  });

  // 4) Observations
  if (observations.length) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 6,
      head: [['Title', 'Severity', 'Status', 'Target Date', 'Raised On']],
      body: observations.map((o) => [
        o.title || '-',
        o.severity || '-',
        o.status || '-',
        fmtDate(o.targetDate),
        fmtDate(o.createdAt),
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, valign: 'top', overflow: 'linebreak' },
      headStyles: { fillColor: BANK.primary, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      ...hooks(),
    });
  }

  // 5) Attachments
  if (attachments.length) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 6,
      head: [['#', 'Attachment']],
      body: attachments.map((f, i) => [String(i + 1), f.name || f.fileName || f.url || '-']),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, valign: 'top', overflow: 'linebreak' },
      headStyles: { fillColor: BANK.primary, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      ...hooks(),
    });
  }

  // 6) Workflow history
  if (workflowHistory.length) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 6,
      head: [['Action', 'By', 'Comment', 'When']],
      body: workflowHistory.map((e) => [
        e.action || e.status || '-',
        e.actorName || '-',
        e.comment || '-',
        fmtDateTime(e.createdAt),
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, valign: 'top', overflow: 'linebreak' },
      headStyles: { fillColor: BANK.primary, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      ...hooks(),
    });
  }

  return doc;
}
