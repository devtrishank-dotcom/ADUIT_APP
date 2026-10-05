const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const AuditType = require('../models/AuditType');
const Template = require('../models/Template');
const WorkflowDefinition = require('../models/WorkflowDefinition');
const AuditInstance = require('../models/AuditInstance');
const User = require('../models/User');
const PACS = require('../models/PACS');
const createMandaliDaftarTemplate = require('./seeds/mandali-daftar-template.seed');
const createInspectionMemoTemplate = require('./seeds/inspection-memo-template.seed');

const WORKFLOW_STAGES = [
  { sequence: 0, name: 'Auditor Submission', actorRole: 'Auditor', actionsAllowed: ['submit'], slaHours: 48 },
  { sequence: 1, name: 'HIA Review', actorRole: 'HIA', actionsAllowed: ['approve', 'return'], slaHours: 72 },
  { sequence: 2, name: 'Approved', actorRole: 'HIA', actionsAllowed: [], slaHours: 0 },
];

async function ensureAuditType(code, name, frequency) {
  let t = await AuditType.findOne({ code });
  if (!t) t = await AuditType.create({ code, name, defaultFrequency: frequency });
  return t;
}

async function ensureWorkflow(auditType) {
  let wf = await WorkflowDefinition.findOne({ auditType: auditType._id });
  if (!wf) {
    wf = await WorkflowDefinition.create({
      auditType: auditType._id,
      version: 1,
      status: 'Published',
      subjectType: 'AuditInstance',
      stages: WORKFLOW_STAGES,
    });
  }
  return wf;
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  // 1. Audit types
  const mandaliType = await ensureAuditType('MANDALI_DAFTAR_TAPASANI', 'Mandali Daftar Tapasani Yadi', 'Annual');
  const inspectionType = await ensureAuditType('INTERNAL_INSPECTION_MEMO', 'Internal Inspection Memo', 'HalfYearly');
  console.log('Audit types ready:', mandaliType.code, inspectionType.code);

  // 2. Templates
  let mandaliTemplate = await Template.findOne({ auditType: mandaliType._id });
  if (!mandaliTemplate) mandaliTemplate = await createMandaliDaftarTemplate(mandaliType);
  let inspectionTemplate = await Template.findOne({ auditType: inspectionType._id });
  if (!inspectionTemplate) inspectionTemplate = await createInspectionMemoTemplate(inspectionType);
  console.log('Templates ready. Mandali sections:', mandaliTemplate.sections.length, '| Inspection sections:', inspectionTemplate.sections.length);

  // 3. Workflows
  const mandaliWf = await ensureWorkflow(mandaliType);
  const inspectionWf = await ensureWorkflow(inspectionType);
  console.log('Workflows ready.');

  // Link audit types to template + workflow
  mandaliType.currentTemplateId = mandaliTemplate._id;
  mandaliType.workflowDefId = mandaliWf._id;
  await mandaliType.save();
  inspectionType.currentTemplateId = inspectionTemplate._id;
  inspectionType.workflowDefId = inspectionWf._id;
  await inspectionType.save();

  // 4. Create audit instances for BM001 (Junagadh) and BM002 (Veraval)
  const bm1 = await User.findOne({ employeeCode: 'BM001' });
  const bm2 = await User.findOne({ employeeCode: 'BM002' });
  if (!bm1 || !bm2) { console.log('ERROR: BM001/BM002 not found'); process.exit(1); }

  const pacs1 = await PACS.find({ linkedBranch: bm1.branch }).sort({ name: 1 });
  const pacs2 = await PACS.find({ linkedBranch: bm2.branch }).sort({ name: 1 });

  const fyFrom = new Date('2025-04-01');
  const fyTo = new Date('2026-03-31');

  const existing = await AuditInstance.countDocuments({});
  if (existing > 0) {
    console.log(`WARN: ${existing} audit instances already exist. Skipping instance creation.`);
  } else {
    const instances = [];
    // BM001 - Junagadh: 2 mandali audits (mandali-daftar + inspection-memo)
    if (pacs1[0]) {
      instances.push({ auditType: mandaliType._id, template: mandaliTemplate._id, workflowDef: mandaliWf._id, entityType: 'PACS', entityId: pacs1[0]._id, periodFrom: fyFrom, periodTo: fyTo, startedBy: bm1._id, startedAt: new Date(), status: 'InProgress' });
      instances.push({ auditType: inspectionType._id, template: inspectionTemplate._id, workflowDef: inspectionWf._id, entityType: 'PACS', entityId: pacs1[0]._id, periodFrom: fyFrom, periodTo: fyTo, startedBy: bm1._id, startedAt: new Date(), status: 'InProgress' });
    }
    // BM002 - Veraval: 2 mandali audits
    if (pacs2[0]) {
      instances.push({ auditType: mandaliType._id, template: mandaliTemplate._id, workflowDef: mandaliWf._id, entityType: 'PACS', entityId: pacs2[0]._id, periodFrom: fyFrom, periodTo: fyTo, startedBy: bm2._id, startedAt: new Date(), status: 'InProgress' });
      instances.push({ auditType: inspectionType._id, template: inspectionTemplate._id, workflowDef: inspectionWf._id, entityType: 'PACS', entityId: pacs2[0]._id, periodFrom: fyFrom, periodTo: fyTo, startedBy: bm2._id, startedAt: new Date(), status: 'InProgress' });
    }
    await AuditInstance.insertMany(instances);
    console.log(`Created ${instances.length} audit instances (BM001 + BM002).`);
  }

  await mongoose.disconnect();
  console.log('\nDONE');
})().catch((e) => { console.error(e); process.exit(1); });
