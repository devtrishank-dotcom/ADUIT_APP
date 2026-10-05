const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const AuditType = require('../models/AuditType');
const WorkflowDefinition = require('../models/WorkflowDefinition');
const Template = require('../models/Template');

const createMandaliDaftarTemplate = require('./mandali-daftar-template.seed');
const createInspectionMemoTemplate = require('./inspection-memo-template.seed');

const STAGES = [
  { sequence: 0, name: 'Auditor Submission', actorRole: 'Auditor', actionsAllowed: ['submit'], slaHours: 48 },
  { sequence: 1, name: 'HIA Review', actorRole: 'HIA', actionsAllowed: ['approve', 'return'], slaHours: 72 },
  { sequence: 2, name: 'Approved', actorRole: 'HIA', actionsAllowed: [], slaHours: 0 },
];

async function ensureAuditType(code, name, defaultFrequency) {
  let at = await AuditType.findOne({ code });
  if (!at) {
    at = await AuditType.create({ code, name, defaultFrequency });
    console.log(`  Created AuditType ${code}.`);
  } else {
    console.log(`  AuditType ${code} already exists.`);
  }
  return at;
}

async function ensureWorkflow(auditType) {
  const existing = await WorkflowDefinition.findOne({ auditType: auditType._id });
  if (existing) return existing;
  const wf = await WorkflowDefinition.create({
    auditType: auditType._id,
    version: 1,
    status: 'Published',
    subjectType: 'AuditInstance',
    stages: STAGES,
  });
  await AuditType.findByIdAndUpdate(auditType._id, { workflowDefId: wf._id });
  console.log(`  Created WorkflowDefinition for ${auditType.code}.`);
  return wf;
}

async function ensureTemplate(auditType, creator) {
  const existing = await Template.findOne({ auditType: auditType._id });
  if (existing) {
    console.log(`  Template already exists for ${auditType.code}; skipping.`);
    return existing;
  }
  const t = await creator(auditType);
  console.log(`  Created template for ${auditType.code} with ${t.sections.length} sections.`);
  return t;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/audit_management');
  console.log('MongoDB connected.');

  const mandali = await ensureAuditType('MANDALI_DAFTAR_TAPASANI', 'Mandali Daftar Tapasani Yadi', 'Annual');
  const memo = await ensureAuditType('INTERNAL_INSPECTION_MEMO', 'Internal Inspection Memo', 'HalfYearly');

  await ensureWorkflow(mandali);
  await ensureWorkflow(memo);

  await ensureTemplate(mandali, createMandaliDaftarTemplate);
  await ensureTemplate(memo, createInspectionMemoTemplate);

  console.log('Inspection templates seeded.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
