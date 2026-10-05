const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const AuditType = require('../models/AuditType');
const Template = require('../models/Template');
const WorkflowDefinition = require('../models/WorkflowDefinition');
const AuditInstance = require('../models/AuditInstance');
const AuditResponse = require('../models/AuditResponse');
const Observation = require('../models/Observation');
const ComplianceAction = require('../models/ComplianceAction');
const AuditPlan = require('../models/AuditPlan');
const AuditPlanItem = require('../models/AuditPlanItem');
const WorkflowInstance = require('../models/WorkflowInstance');
const WorkflowTransitionLog = require('../models/WorkflowTransitionLog');
const Attachment = require('../models/Attachment');
const ClosureCertificate = require('../models/ClosureCertificate');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const PACS = require('../models/PACS');
const Branch = require('../models/Branch');
const User = require('../models/User');

async function cleanOldData() {
  console.log('Removing old audit/form data...');
  await AuditResponse.deleteMany({});
  await Observation.deleteMany({});
  await ComplianceAction.deleteMany({});
  await AuditInstance.deleteMany({});
  await AuditPlanItem.deleteMany({});
  await AuditPlan.deleteMany({});
  await WorkflowTransitionLog.deleteMany({});
  await WorkflowInstance.deleteMany({});
  await Attachment.deleteMany({});
  await ClosureCertificate.deleteMany({});
  await Notification.deleteMany({});
  await ActivityLog.deleteMany({});

  console.log('Removing old (non-Gujarati) audit types & templates...');
  const oldTypes = await AuditType.find({ code: { $in: ['BRANCH_AUDIT', 'PACS_AUDIT'] } });
  for (const t of oldTypes) {
    await Template.deleteMany({ auditType: t._id });
    await WorkflowDefinition.deleteMany({ auditType: t._id });
    await AuditType.deleteOne({ _id: t._id });
  }
  console.log('  Old data removed.');
}

async function getSetup(code) {
  const auditType = await AuditType.findOne({ code });
  const template = await Template.findOne({ auditType: auditType._id });
  return { auditType, template };
}

function resp(instanceId, userId, sectionCode, fieldCode, value, extra = {}) {
  return {
    auditInstance: instanceId,
    sectionCode,
    fieldCode,
    gridRowIndex: -1,
    value,
    updatedBy: userId,
    ...extra,
  };
}

function gridResp(instanceId, userId, sectionCode, fieldCode, rowIndex, columnCode, value) {
  return {
    auditInstance: instanceId,
    sectionCode,
    fieldCode,
    gridRowIndex: rowIndex,
    columnCode,
    value,
    updatedBy: userId,
  };
}

async function createInstance({ auditType, template, entityType, entityId, auditor, status, started }) {
  return AuditInstance.create({
    planItem: null,
    auditType: auditType._id,
    template: template._id,
    workflowDef: auditType.workflowDefId,
    entityType,
    entityId,
    periodFrom: new Date('2025-04-01'),
    periodTo: new Date('2026-03-31'),
    startedBy: started ? auditor._id : null,
    startedAt: started ? new Date() : null,
    status,
  });
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/audit_management');
  console.log('MongoDB connected.');

  await cleanOldData();

  const mandali = await getSetup('MANDALI_DAFTAR_TAPASANI');
  const memo = await getSetup('INTERNAL_INSPECTION_MEMO');
  if (!mandali.template || !memo.template) {
    console.error('Gujarati templates not found. Run: npm run seed:inspection');
    process.exit(1);
  }

  const pacs = await PACS.findOne();
  const branch = await Branch.findOne();
  let auditor = await User.findOne({ employeeCode: { $in: ['EMP004', 'JJS004'] } });
  if (!auditor) auditor = await User.findOne({ designation: 'Auditor' });
  if (!auditor) auditor = await User.findOne();

  // Form 1: Mandali - FILLED (answers given)
  const f1 = await createInstance({ auditType: mandali.auditType, template: mandali.template, entityType: 'PACS', entityId: pacs._id, auditor, status: 'InProgress', started: true });
  await AuditResponse.insertMany([
    resp(f1._id, auditor._id, 'SEC_MD_HEADER', 'FLD_MD_YADI_DATE', '2026-01-10'),
    resp(f1._id, auditor._id, 'SEC_MD_HEADER', 'FLD_MD_SOC_NAME', 'શિવાજી પીએસીએસ પુણે'),
    resp(f1._id, auditor._id, 'SEC_MD_HEADER', 'FLD_MD_WORK_VILLAGE', 'શિવાજીનગર'),
    resp(f1._id, auditor._id, 'SEC_MD_HEADER', 'FLD_MD_TALUKA', 'હવેલી'),
    resp(f1._id, auditor._id, 'SEC_MD_HEADER', 'FLD_MD_OFFICER_NAME', 'કે. આર. પટેલ'),
    resp(f1._id, auditor._id, 'SEC_MD_HEADER', 'FLD_MD_OFFICER_DESG', 'શાખા મેનેજર'),
    resp(f1._id, auditor._id, 'SEC_MD_HEADER', 'FLD_MD_REG_NO', 'PACS-W-001'),
    resp(f1._id, auditor._id, 'SEC_MD_HEADER', 'FLD_MD_INSPECTION_FROM', '2026-01-05'),
    resp(f1._id, auditor._id, 'SEC_MD_HEADER', 'FLD_MD_INSPECTION_TO', '2026-01-10'),
    resp(f1._id, auditor._id, 'SEC_MD_STOCK_SILAK', 'FLD_MD_PROP_CARD_DATE', '2026-01-06'),
    resp(f1._id, auditor._id, 'SEC_MD_MEMBERS', 'FLD_MD_SEPARATE_OFFICE', true),
    resp(f1._id, auditor._id, 'SEC_MD_MEMBERS', 'FLD_MD_EXT_BORROW_LIMIT', 500000),
    resp(f1._id, auditor._id, 'SEC_MD_RECORDS', 'FLD_MD_DAILY_UPTODATE', true),
    resp(f1._id, auditor._id, 'SEC_MD_RECORDS', 'FLD_MD_REGISTERS_UPTODATE', true),
    resp(f1._id, auditor._id, 'SEC_MD_RECORDS', 'FLD_MD_BOOKS_COMPLETE', false),
    resp(f1._id, auditor._id, 'SEC_MD_RECORDS', 'FLD_MD_DEADSTOCK', true),
    resp(f1._id, auditor._id, 'SEC_MD_STOCK_SILAK_VERIFY', 'FLD_MD_CLOSING_SILAK_AMT', 145000),
    resp(f1._id, auditor._id, 'SEC_MD_STOCK_SILAK_VERIFY', 'FLD_MD_SILAK_PRESENTED_BY', 'મંત્રી - આર. બી. શાહ'),
    resp(f1._id, auditor._id, 'SEC_MD_INSURANCE', 'FLD_MD_FULL_INSURANCE', true),
    resp(f1._id, auditor._id, 'SEC_MD_MANAGING_COMMITTEE', 'FLD_MD_AGM_HELD', true),
    resp(f1._id, auditor._id, 'SEC_MD_MANAGING_COMMITTEE', 'FLD_MD_MC_SIZE', '૧ જોઈએ, ૧ છે'),
    resp(f1._id, auditor._id, 'SEC_MD_ENCLOSURES', 'FLD_MD_ENC_1', true),
    resp(f1._id, auditor._id, 'SEC_MD_ENCLOSURES', 'FLD_MD_ENC_2', true),
    resp(f1._id, auditor._id, 'SEC_MD_SIGNOFF', 'FLD_MD_PLACE', 'પુણે'),
    resp(f1._id, auditor._id, 'SEC_MD_SIGNOFF', 'FLD_MD_DATE', '2026-01-10'),
    resp(f1._id, auditor._id, 'SEC_MD_SIGNOFF', 'FLD_MD_SIGN_NAME', 'કે. આર. પટેલ'),
    resp(f1._id, auditor._id, 'SEC_MD_SIGNOFF', 'FLD_MD_SIGN_DESG', 'બ્રાન્ચ મેનેજર'),
    gridResp(f1._id, auditor._id, 'SEC_MD_MEMBERS', 'FLD_MD_MEMBER_GRID', 0, 'COL_SMALL_FARMER', 120),
    gridResp(f1._id, auditor._id, 'SEC_MD_MEMBERS', 'FLD_MD_MEMBER_GRID', 0, 'COL_OTHER_FARMER', 40),
    gridResp(f1._id, auditor._id, 'SEC_MD_MEMBERS', 'FLD_MD_MEMBER_GRID', 0, 'COL_TOTAL', 160),
    gridResp(f1._id, auditor._id, 'SEC_MD_MEMBERS', 'FLD_MD_MEMBER_GRID', 1, 'COL_SMALL_FARMER', 95),
    gridResp(f1._id, auditor._id, 'SEC_MD_MEMBERS', 'FLD_MD_MEMBER_GRID', 1, 'COL_OTHER_FARMER', 30),
    gridResp(f1._id, auditor._id, 'SEC_MD_MEMBERS', 'FLD_MD_MEMBER_GRID', 1, 'COL_TOTAL', 125),
  ]);

  // Form 2: Inspection Memo - FILLED (answers given)
  const f2 = await createInstance({ auditType: memo.auditType, template: memo.template, entityType: 'Branch', entityId: branch._id, auditor, status: 'InProgress', started: true });
  await AuditResponse.insertMany([
    resp(f2._id, auditor._id, 'SEC_IM_HEADER', 'FLD_IM_BRANCH_NAME', 'મેઈન બ્રાન્ચ - મુંબઈ'),
    resp(f2._id, auditor._id, 'SEC_IM_HEADER', 'FLD_IM_OFFICER_NAME', 'એસ. કે. દેસાઈ'),
    resp(f2._id, auditor._id, 'SEC_IM_HEADER', 'FLD_IM_INSPECTION_DATE', '2026-01-12'),
    resp(f2._id, auditor._id, 'SEC_IM_HEADER', 'FLD_IM_PERIOD_FROM', '2025-10-01'),
    resp(f2._id, auditor._id, 'SEC_IM_HEADER', 'FLD_IM_PERIOD_TO', '2026-03-31'),
    resp(f2._id, auditor._id, 'SEC_IM_CASH_SILAK', 'FLD_IM_SILAK_HAND', 250000),
    resp(f2._id, auditor._id, 'SEC_IM_CASH_SILAK', 'FLD_IM_SILAK_BANK', 100000),
    resp(f2._id, auditor._id, 'SEC_IM_CASH_SILAK', 'FLD_IM_SILAK_KEPT', 'તિજોરી'),
    resp(f2._id, auditor._id, 'SEC_IM_CASH_SILAK', 'FLD_IM_WITHIN_LIMIT', true),
    resp(f2._id, auditor._id, 'SEC_IM_CASH_SILAK', 'FLD_IM_NOTE_MACHINE', true),
    resp(f2._id, auditor._id, 'SEC_IM_CASH_SILAK', 'FLD_IM_CCTV_CUSTODY', true),
    resp(f2._id, auditor._id, 'SEC_IM_CASH_SILAK', 'FLD_IM_NOTICE_BOARD_RBI', true),
    resp(f2._id, auditor._id, 'SEC_IM_CASH_SILAK', 'FLD_IM_RESPONSIBLE_STAFF', 'એચ. ટી. પટેલ'),
    resp(f2._id, auditor._id, 'SEC_IM_CASH_SUMMARY_SIGN', 'FLD_IM_SUMMARY_SIGN', true),
    resp(f2._id, auditor._id, 'SEC_IM_CASH_SUMMARY_SIGN', 'FLD_IM_FEE_REGISTER', true),
    resp(f2._id, auditor._id, 'SEC_IM_COMPUTER_MAINT', 'FLD_IM_EQUIPMENT_MAINT', true),
    resp(f2._id, auditor._id, 'SEC_IM_STAFF_WORK', 'FLD_IM_WORK_ROTATION', true),
    resp(f2._id, auditor._id, 'SEC_IM_LOCKERS', 'FLD_IM_LOCKER_CBS', true),
    resp(f2._id, auditor._id, 'SEC_IM_DAYBOOK_VOUCHERS', 'FLD_IM_VOUCHER_BINDING', true),
    resp(f2._id, auditor._id, 'SEC_IM_SIGNOFF', 'FLD_IM_PLACE', 'મુંબઈ'),
    resp(f2._id, auditor._id, 'SEC_IM_SIGNOFF', 'FLD_IM_DATE', '2026-01-12'),
    resp(f2._id, auditor._id, 'SEC_IM_SIGNOFF', 'FLD_IM_SIGN_NAME', 'એસ. કે. દેસાઈ'),
    gridResp(f2._id, auditor._id, 'SEC_IM_CASH_SILAK', 'FLD_IM_DENOM_GRID', 0, 'COL_COUNT', 10),
    gridResp(f2._id, auditor._id, 'SEC_IM_CASH_SILAK', 'FLD_IM_DENOM_GRID', 0, 'COL_AMOUNT', 5000),
    gridResp(f2._id, auditor._id, 'SEC_IM_CASH_SILAK', 'FLD_IM_DENOM_GRID', 2, 'COL_COUNT', 20),
    gridResp(f2._id, auditor._id, 'SEC_IM_CASH_SILAK', 'FLD_IM_DENOM_GRID', 2, 'COL_AMOUNT', 200000),
  ]);

  // Form 3,4: Mandali - TO FILL (blank)
  const f3 = await createInstance({ auditType: mandali.auditType, template: mandali.template, entityType: 'PACS', entityId: pacs._id, auditor, status: 'Draft', started: false });
  const f4 = await createInstance({ auditType: mandali.auditType, template: mandali.template, entityType: 'PACS', entityId: pacs._id, auditor, status: 'Draft', started: false });

  // Form 5: Memo - TO FILL (blank)
  const f5 = await createInstance({ auditType: memo.auditType, template: memo.template, entityType: 'Branch', entityId: branch._id, auditor, status: 'Draft', started: false });

  console.log('Created 5 forms:');
  console.log(`  1. Mandali Daftar  - FILLED   (id ${f1._id})`);
  console.log(`  2. Inspection Memo - FILLED   (id ${f2._id})`);
  console.log(`  3. Mandali Daftar  - TO FILL  (id ${f3._id})`);
  console.log(`  4. Mandali Daftar  - TO FILL  (id ${f4._id})`);
  console.log(`  5. Inspection Memo - TO FILL  (id ${f5._id})`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
