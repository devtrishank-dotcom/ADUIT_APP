const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Branch = require('../models/Branch');
const PACS = require('../models/PACS');
const FinancialYear = require('../models/FinancialYear');
const AuditType = require('../models/AuditType');
const Template = require('../models/Template');
const WorkflowDefinition = require('../models/WorkflowDefinition');
const ValueStatement = require('../models/ValueStatement');
const RiskConfig = require('../models/RiskConfig');
const AuditPlan = require('../models/AuditPlan');
const AuditPlanItem = require('../models/AuditPlanItem');
const AuditInstance = require('../models/AuditInstance');
const AuditResponse = require('../models/AuditResponse');
const Observation = require('../models/Observation');
const ComplianceAction = require('../models/ComplianceAction');
const WorkflowInstance = require('../models/WorkflowInstance');
const WorkflowTransitionLog = require('../models/WorkflowTransitionLog');
const ClosureCertificate = require('../models/ClosureCertificate');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const DemoSeedMarker = require('../models/DemoSeedMarker');

const DEMO_KEY = 'AMS_DEMO_V1';

const daysFromNow = (days) => {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value;
};

const daysAgo = (days) => daysFromNow(-days);

const findOrCreate = async (Model, query, data) => {
  const existing = await Model.findOne(query);
  if (existing) return existing;
  return Model.create(data);
};

const upsert = async (Model, query, data) => Model.findOneAndUpdate(
  query,
  { $set: data },
  { new: true, upsert: true, setDefaultsOnInsert: true },
);

const addResponse = async (instance, sectionCode, fieldCode, value, riskPointsApplied = 0, severity = 'Low') => {
  return upsert(
    AuditResponse,
    { auditInstance: instance._id, sectionCode, fieldCode, gridRowIndex: -1, columnCode: null },
    { auditInstance: instance._id, sectionCode, fieldCode, gridRowIndex: -1, columnCode: null, value, riskPointsApplied, severity, updatedBy: instance.startedBy },
  );
};

const addObservation = async (instance, fieldCode, data) => {
  const query = { auditInstance: instance._id, fieldCode };
  const existing = await Observation.findOne(query);
  if (existing) {
    Object.assign(existing, data);
    await existing.save();
    return existing;
  }
  return Observation.create({ ...query, ...data });
};

const addComplianceAction = async (observation, submittedBy, data) => {
  const query = { observation: observation._id, actionType: data.actionType, submittedBy };
  return upsert(ComplianceAction, query, {
    observation: observation._id,
    submittedBy,
    submittedAt: data.submittedAt || new Date(),
    ...data,
  });
};

const ensureWorkflow = async (instance, workflowDef, stageIndex, status, assignedTo, action) => {
  const workflow = await upsert(
    WorkflowInstance,
    { subjectType: 'AuditInstance', subjectId: instance._id },
    {
      subjectType: 'AuditInstance',
      subjectId: instance._id,
      workflowDef: workflowDef._id,
      currentStageIndex: stageIndex,
      status,
      assignedTo,
    },
  );

  instance.workflowInstance = workflow._id;
  await instance.save();

  await upsert(
    WorkflowTransitionLog,
    { workflowInstance: workflow._id, action },
    {
      workflowInstance: workflow._id,
      fromStageIndex: 0,
      toStageIndex: stageIndex,
      action,
      actorUser: instance.startedBy,
      comment: 'Demo data workflow history',
      actedAt: new Date(),
    },
  );

  return workflow;
};

const ensureAudit = async (planItem, data) => {
  const existing = await AuditInstance.findOne({ planItem: planItem._id });
  if (existing) {
    Object.assign(existing, data);
    await existing.save();
    return existing;
  }
  return AuditInstance.create({ planItem: planItem._id, ...data });
};

async function seedDemoData() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/audit_management');
  console.log('MongoDB connected for demo data.');

  if (await DemoSeedMarker.exists({ key: DEMO_KEY })) {
    console.log('Demo data is already seeded. Nothing changed.');
    return;
  }

  const [admin, hia, planner, auditor, branchManager, complianceOwner] = await Promise.all([
    User.findOne({ employeeCode: 'EMP001' }),
    User.findOne({ employeeCode: 'EMP002' }),
    User.findOne({ employeeCode: 'EMP003' }),
    User.findOne({ employeeCode: 'EMP004' }),
    User.findOne({ employeeCode: 'EMP005' }),
    User.findOne({ employeeCode: 'EMP006' }),
  ]);
  const financialYear = await FinancialYear.findOne({ code: 'FY2025-26' });
  const branchAuditType = await AuditType.findOne({ code: 'BRANCH_AUDIT' });
  const pacsAuditType = await AuditType.findOne({ code: 'PACS_AUDIT' });
  const branches = await Branch.find({ status: 'active' }).sort({ code: 1 }).limit(5);
  const pacsList = await PACS.find({ status: 'active' }).sort({ registrationNumber: 1 }).limit(5);
  const branchTemplate = await Template.findOne({ auditType: branchAuditType._id, status: 'Published' }).sort({ version: -1 });
  const pacsTemplate = await Template.findOne({ auditType: pacsAuditType._id, status: 'Published' }).sort({ version: -1 });
  const branchWorkflow = await WorkflowDefinition.findOne({ auditType: branchAuditType._id, status: 'Published' }).sort({ version: -1 });
  const pacsWorkflow = await WorkflowDefinition.findOne({ auditType: pacsAuditType._id, status: 'Published' }).sort({ version: -1 });

  if (!admin || !hia || !planner || !auditor || !branchManager || !complianceOwner || !financialYear || !branchAuditType || !pacsAuditType || !branchTemplate || !pacsTemplate || !branchWorkflow || !pacsWorkflow || branches.length < 3 || pacsList.length < 3) {
    throw new Error('Base seed data is incomplete. Run npm run seed first.');
  }

  console.log('Creating value statements and risk configurations...');
  const cashGuidance = await upsert(ValueStatement, { code: 'VS_DEMO_CASH_CHECK' }, {
    code: 'VS_DEMO_CASH_CHECK',
    textEn: 'Verify physical cash and reconcile it with the cash scroll and ledger balance.',
    textGu: 'ભૌતિક રોકડ ચકાસો અને કેશ સ્ક્રોલ તથા લેજર બેલેન્સ સાથે મેળવો.',
    category: 'Cash Verification',
    version: 1,
    isActive: true,
  });
  await upsert(ValueStatement, { code: 'VS_DEMO_REGISTER_CHECK' }, {
    code: 'VS_DEMO_REGISTER_CHECK',
    textEn: 'Confirm that the register is maintained, up to date, and signed by the responsible officer.',
    textGu: 'રજીસ્ટર જાળવેલ, અપડેટ અને જવાબદાર અધિકારી દ્વારા સહી કરેલ છે કે નહીં તે ચકાસો.',
    category: 'Registers',
    version: 1,
    isActive: true,
  });

  const bands = [
    { bandName: 'Green', bandColor: '#38a169', minScore: 0, maxScore: 40, description: 'Low risk' },
    { bandName: 'Yellow', bandColor: '#d69e2e', minScore: 41, maxScore: 70, description: 'Medium risk' },
    { bandName: 'Red', bandColor: '#e53e3e', minScore: 71, maxScore: 100, description: 'High risk' },
  ];
  await upsert(RiskConfig, { auditType: branchAuditType._id, level: 'template', name: 'Demo Branch Risk Bands' }, {
    auditType: branchAuditType._id,
    level: 'template',
    name: 'Demo Branch Risk Bands',
    weight: 1,
    formulaRef: 'weighted_sum_normalized',
    bandDefinitions: bands,
    specialRules: [{ condition: 'anyCriticalObservation == true', forceBand: 'Red' }],
  });
  await upsert(RiskConfig, { auditType: pacsAuditType._id, level: 'template', name: 'Demo PACS Risk Bands' }, {
    auditType: pacsAuditType._id,
    level: 'template',
    name: 'Demo PACS Risk Bands',
    weight: 1,
    formulaRef: 'weighted_sum_normalized',
    bandDefinitions: bands,
    specialRules: [{ condition: 'anyCriticalObservation == true', forceBand: 'Red' }],
  });

  const cashSection = branchTemplate.sections.find((section) => section.code === 'SEC_CASH_SILAK');
  const cashField = cashSection?.fields?.find((field) => field.code === 'FLD_CASH_ON_HAND');
  if (cashField) {
    cashField.valueStatementIds = [cashGuidance._id];
    await branchTemplate.save();
  }

  console.log('Creating demo audit plans and plan items...');
  const approvedPlan = await findOrCreate(
    AuditPlan,
    { financialYear: financialYear._id, createdBy: planner._id, status: 'Approved' },
    { financialYear: financialYear._id, createdBy: planner._id, approvedBy: hia._id, approvedAt: daysAgo(12), status: 'Approved' },
  );
  const draftPlan = await findOrCreate(
    AuditPlan,
    { financialYear: financialYear._id, createdBy: planner._id, status: 'Draft' },
    { financialYear: financialYear._id, createdBy: planner._id, status: 'Draft' },
  );

  const planItem = async (plan, auditType, entityType, entityId, assignedTo, data) => findOrCreate(
    AuditPlanItem,
    { plan: plan._id, auditType: auditType._id, entityType, entityId },
    {
      plan: plan._id,
      auditType: auditType._id,
      entityType,
      entityId,
      assignedTo,
      periodFrom: financialYear.startDate,
      periodTo: financialYear.endDate,
      ...data,
    },
  );

  const branchSubmittedItem = await planItem(approvedPlan, branchAuditType, 'Branch', branches[0]._id, auditor, {
    plannedStart: daysAgo(18),
    plannedEnd: daysAgo(12),
    actualStart: daysAgo(16),
    priority: 'High',
    status: 'InProgress',
  });
  const pacsApprovedItem = await planItem(approvedPlan, pacsAuditType, 'PACS', pacsList[0]._id, branchManager, {
    plannedStart: daysAgo(30),
    plannedEnd: daysAgo(24),
    actualStart: daysAgo(29),
    actualEnd: daysAgo(23),
    priority: 'Medium',
    status: 'Completed',
  });
  const branchClosedItem = await planItem(approvedPlan, branchAuditType, 'Branch', branches[1]._id, auditor, {
    plannedStart: daysAgo(60),
    plannedEnd: daysAgo(54),
    actualStart: daysAgo(59),
    actualEnd: daysAgo(52),
    priority: 'Low',
    status: 'Completed',
  });
  const pacsDraftItem = await planItem(draftPlan, pacsAuditType, 'PACS', pacsList[1]._id, branchManager, {
    plannedStart: daysFromNow(12),
    plannedEnd: daysFromNow(18),
    priority: 'High',
    status: 'Planned',
  });
  await planItem(draftPlan, branchAuditType, 'Branch', branches[2]._id, auditor, {
    plannedStart: daysFromNow(20),
    plannedEnd: daysFromNow(25),
    priority: 'Medium',
    status: 'Planned',
  });

  console.log('Creating demo audit instances and responses...');
  const submittedAudit = await ensureAudit(branchSubmittedItem, {
    auditType: branchAuditType._id,
    template: branchTemplate._id,
    workflowDef: branchWorkflow._id,
    entityType: 'Branch',
    entityId: branches[0]._id,
    periodFrom: financialYear.startDate,
    periodTo: financialYear.endDate,
    startedBy: auditor._id,
    startedAt: daysAgo(16),
    submittedAt: daysAgo(10),
    status: 'Submitted',
    overallRiskScore: 74,
    overallRiskBand: 'Red',
  });
  await addResponse(submittedAudit, 'SEC_CASH_SILAK', 'FLD_CASH_ON_HAND', 128500, 0, 'Low');
  await addResponse(submittedAudit, 'SEC_CASH_SILAK', 'FLD_WITHIN_CASH_LIMIT', 'NOT_COMPLIED', 25, 'Critical');
  await addResponse(submittedAudit, 'SEC_KEY_REGISTER', 'FLD_KEY_REGISTER_MAINTAINED', 'NO', 8, 'High');
  await ensureWorkflow(submittedAudit, branchWorkflow, 1, 'Active', hia._id, 'Submitted');

  const approvedAudit = await ensureAudit(pacsApprovedItem, {
    auditType: pacsAuditType._id,
    template: pacsTemplate._id,
    workflowDef: pacsWorkflow._id,
    entityType: 'PACS',
    entityId: pacsList[0]._id,
    periodFrom: financialYear.startDate,
    periodTo: financialYear.endDate,
    startedBy: branchManager._id,
    startedAt: daysAgo(29),
    submittedAt: daysAgo(24),
    completedAt: daysAgo(20),
    status: 'Approved',
    overallRiskScore: 48,
    overallRiskBand: 'Yellow',
  });
  await addResponse(approvedAudit, 'SEC_GENERAL_INFO', 'FLD_MEMBER_COUNT', 842, 0, 'Low');
  await addResponse(approvedAudit, 'SEC_PACS_STOCK_SILAK', 'FLD_STOCK_PHYSICAL_VERIFIED', 'YES', 0, 'Low');
  await ensureWorkflow(approvedAudit, pacsWorkflow, 2, 'Completed', hia._id, 'Approved');

  const closedAudit = await ensureAudit(branchClosedItem, {
    auditType: branchAuditType._id,
    template: branchTemplate._id,
    workflowDef: branchWorkflow._id,
    entityType: 'Branch',
    entityId: branches[1]._id,
    periodFrom: financialYear.startDate,
    periodTo: financialYear.endDate,
    startedBy: auditor._id,
    startedAt: daysAgo(59),
    submittedAt: daysAgo(54),
    completedAt: daysAgo(48),
    status: 'Closed',
    overallRiskScore: 28,
    overallRiskBand: 'Green',
  });
  await addResponse(closedAudit, 'SEC_CASH_SILAK', 'FLD_CASH_ON_HAND', 97500, 0, 'Low');
  await ensureWorkflow(closedAudit, branchWorkflow, 2, 'Completed', hia._id, 'Approved');

  const draftAudit = await ensureAudit(pacsDraftItem, {
    auditType: pacsAuditType._id,
    template: pacsTemplate._id,
    workflowDef: pacsWorkflow._id,
    entityType: 'PACS',
    entityId: pacsList[1]._id,
    periodFrom: financialYear.startDate,
    periodTo: financialYear.endDate,
    startedBy: branchManager._id,
    startedAt: daysAgo(2),
    status: 'InProgress',
    overallRiskScore: 18,
    overallRiskBand: 'Green',
  });
  await addResponse(draftAudit, 'SEC_GENERAL_INFO', 'FLD_MEMBER_COUNT', 516, 0, 'Low');

  console.log('Creating observations and compliance history...');
  const openObservation = await addObservation(submittedAudit, 'FLD_WITHIN_CASH_LIMIT', {
    sectionCode: 'SEC_CASH_SILAK',
    title: 'Cash holding exceeded approved limit',
    description: 'Cash on hand exceeded the approved branch holding limit on the inspection date. Branch must reconcile and submit evidence.',
    severity: 'Critical',
    targetDate: daysAgo(3),
    status: 'Open',
    createdAt: daysAgo(35),
  });
  const partialObservation = await addObservation(submittedAudit, 'FLD_KEY_REGISTER_MAINTAINED', {
    sectionCode: 'SEC_KEY_REGISTER',
    title: 'Key register was not up to date',
    description: 'Key register entries were incomplete for the inspection period.',
    severity: 'High',
    targetDate: daysFromNow(5),
    status: 'PartiallyComplied',
    createdAt: daysAgo(12),
  });
  await addComplianceAction(partialObservation, complianceOwner._id, {
    actionType: 'Response',
    description: 'Register has been updated and the missing entries are being reviewed by the branch manager.',
    statusBefore: 'Open',
    statusAfter: 'PartiallyComplied',
    submittedAt: daysAgo(4),
  });

  const verifiedObservation = await addObservation(approvedAudit, 'FLD_STOCK_PHYSICAL_VERIFIED', {
    sectionCode: 'SEC_PACS_STOCK_SILAK',
    title: 'Stock verification evidence submitted',
    description: 'Physical stock verification evidence was reviewed and accepted.',
    severity: 'Medium',
    targetDate: daysAgo(18),
    status: 'Verified',
    createdAt: daysAgo(22),
  });
  await addComplianceAction(verifiedObservation, branchManager._id, {
    actionType: 'Response',
    description: 'Signed stock verification statement uploaded for review.',
    statusBefore: 'Open',
    statusAfter: 'Complied',
    submittedAt: daysAgo(19),
  });
  await addComplianceAction(verifiedObservation, hia._id, {
    actionType: 'Verification',
    description: 'Evidence verified by HIA.',
    statusBefore: 'Complied',
    statusAfter: 'Verified',
    submittedAt: daysAgo(18),
  });

  const closedObservation = await addObservation(closedAudit, 'FLD_CASH_ON_HAND', {
    sectionCode: 'SEC_CASH_SILAK',
    title: 'Cash reconciliation completed',
    description: 'Minor reconciliation note was corrected and verified during closure review.',
    severity: 'Low',
    targetDate: daysAgo(45),
    status: 'Verified',
    createdAt: daysAgo(52),
  });
  await addComplianceAction(closedObservation, auditor._id, {
    actionType: 'Verification',
    description: 'Correction checked during follow-up.',
    statusBefore: 'Complied',
    statusAfter: 'Verified',
    submittedAt: daysAgo(48),
  });

  const certificate = await upsert(ClosureCertificate, { auditInstance: closedAudit._id }, {
    auditInstance: closedAudit._id,
    certificateNumber: 'CLS-DEMO-001',
    generatedAt: daysAgo(47),
    signedBy_hia: hia._id,
    signedBy_auditor: auditor._id,
    remarks: 'Demo closure certificate for training and walkthrough.',
  });
  closedAudit.closureCertificate = certificate._id;
  await closedAudit.save();

  console.log('Creating notifications and activity log entries...');
  const notifications = [
    [admin._id, 'SYSTEM_DEMO_READY', 'AMS demo data is ready', 'Explore Planning, My Audits, HIA Review, Compliance, Closure, and Reports.'],
    [auditor._id, 'AUDIT_ASSIGNED', 'New Branch Audit assigned', 'BR001 audit is ready for execution.'],
    [hia._id, 'HIA_PENDING', 'Audit pending HIA review', 'Branch Audit for Main Branch - Mumbai is awaiting your review.'],
    [branchManager._id, 'COMPLIANCE_DUE', 'Compliance response due', 'A PACS compliance response is due for review.'],
  ];
  for (const [user, eventType, title, message] of notifications) {
    await upsert(Notification, { user, eventType, title }, {
      user,
      eventType,
      subjectType: 'AuditInstance',
      subjectId: submittedAudit._id,
      channel: 'InApp',
      title,
      message,
      isRead: false,
      sentAt: new Date(),
    });
  }

  const activityEntries = [
    [submittedAudit._id, 'AuditSubmitted', 'Audit submitted for HIA review'],
    [approvedAudit._id, 'AuditApproved', 'Audit approved by HIA'],
    [closedAudit._id, 'AuditClosed', 'Closure certificate generated'],
  ];
  for (const [entityId, action, description] of activityEntries) {
    await upsert(ActivityLog, { entityType: 'AuditInstance', entityId, action }, {
      actorUser: hia._id,
      entityType: 'AuditInstance',
      entityId,
      action,
      afterJson: { description },
      ipAddress: '127.0.0.1',
      userAgent: 'AMS demo seed',
    });
  }

  await DemoSeedMarker.create({ key: DEMO_KEY, description: 'AMS demo data for end-to-end walkthrough' });
  console.log('Demo data seeded successfully.');
}

seedDemoData()
  .catch((error) => {
    console.error('Demo seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
