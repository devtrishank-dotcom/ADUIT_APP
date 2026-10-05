const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const OptionList = require('../models/OptionList');
const ValueStatement = require('../models/ValueStatement');
const RiskConfig = require('../models/RiskConfig');
const AuditType = require('../models/AuditType');
const AuditPlan = require('../models/AuditPlan');
const AuditPlanItem = require('../models/AuditPlanItem');
const AuditInstance = require('../models/AuditInstance');
const Observation = require('../models/Observation');
const ClosureCertificate = require('../models/ClosureCertificate');
const FinancialYear = require('../models/FinancialYear');
const User = require('../models/User');
const PACS = require('../models/PACS');

async function upsertOptionList(code, name, isShared, items) {
  const existing = await OptionList.findOne({ code });
  if (existing) return existing;
  return OptionList.create({ code, name, isShared, items });
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  // 1. Option Lists
  await upsertOptionList('OL_COMPLIANCE_STATUS', 'Compliance Status', true, [
    { value: 'COMPLIED', labelEn: 'Complied', labelGu: 'અનુપાલિત', riskPoints: 0, severity: 'None', sequence: 1 },
    { value: 'PARTIALLY_COMPLIED', labelEn: 'Partially Complied', labelGu: 'આંશિક અનુપાલિત', riskPoints: 3, severity: 'Medium', sequence: 2 },
    { value: 'NOT_COMPLIED', labelEn: 'Not Complied', labelGu: 'અનુપાલિત નથી', riskPoints: 5, severity: 'High', sequence: 3 },
    { value: 'NOT_APPLICABLE', labelEn: 'Not Applicable', labelGu: 'લાગુ પડતું નથી', riskPoints: 0, severity: 'None', sequence: 4 },
  ]);
  await upsertOptionList('OL_YES_NO', 'Yes / No', true, [
    { value: 'YES', labelEn: 'Yes', labelGu: 'હા', riskPoints: 0, severity: 'None', sequence: 1 },
    { value: 'NO', labelEn: 'No', labelGu: 'ના', riskPoints: 5, severity: 'High', sequence: 2 },
  ]);
  await upsertOptionList('OL_SEVERITY', 'Risk Severity', true, [
    { value: 'LOW', labelEn: 'Low', labelGu: 'ઓછું', riskPoints: 1, severity: 'Low', sequence: 1 },
    { value: 'MEDIUM', labelEn: 'Medium', labelGu: 'મધ્યમ', riskPoints: 3, severity: 'Medium', sequence: 2 },
    { value: 'HIGH', labelEn: 'High', labelGu: 'વધુ', riskPoints: 5, severity: 'High', sequence: 3 },
    { value: 'CRITICAL', labelEn: 'Critical', labelGu: 'ગંભીર', riskPoints: 8, severity: 'Critical', sequence: 4 },
  ]);
  await upsertOptionList('OL_LOAN_TYPE', 'Loan Type', true, [
    { value: 'CROP_LOAN', labelEn: 'Crop Loan', labelGu: 'પાક લોન', sequence: 1 },
    { value: 'GOLD_LOAN', labelEn: 'Gold Loan', labelGu: 'ગોલ્ડ લોન', sequence: 2 },
    { value: 'CASH_CREDIT', labelEn: 'Cash Credit', labelGu: 'રોકડ ધિરાણ', sequence: 3 },
    { value: 'MEDIUM_TERM', labelEn: 'Medium Term Loan', labelGu: 'મધ્યમ મુદત લોન', sequence: 4 },
  ]);
  console.log('Option Lists ready.');

  // 2. Value Statements
  const vs = [
    { code: 'VS_COMPLIED', textEn: 'All requirements are fully complied with.', textGu: 'બધી જરૂરિયાતો સંપૂર્ણપણે અનુપાલિત છે.', category: 'Compliance' },
    { code: 'VS_PARTIAL', textEn: 'Requirements are partially complied with.', textGu: 'જરૂરિયાતો આંશિક રીતે અનુપાલિત છે.', category: 'Compliance' },
    { code: 'VS_NOT_COMPLIED', textEn: 'Requirements are not complied with.', textGu: 'જરૂરિયાતો અનુપાલિત નથી.', category: 'Compliance' },
    { code: 'VS_RECTIFIED', textEn: 'Irregularities have been rectified.', textGu: 'અનિયમિતતાઓ સુધારી લેવામાં આવી છે.', category: 'Closure' },
  ];
  for (const v of vs) {
    const existing = await ValueStatement.findOne({ code: v.code });
    if (!existing) await ValueStatement.create(v);
  }
  console.log('Value Statements ready.');

  // 3. Risk Configs (template-level band definitions for each audit type)
  const auditTypes = await AuditType.find();
  for (const at of auditTypes) {
    const existing = await RiskConfig.findOne({ auditType: at._id, level: 'template' });
    if (!existing) {
      await RiskConfig.create({
        auditType: at._id,
        level: 'template',
        name: `${at.name} Risk Bands`,
        weight: 100,
        bandDefinitions: [
          { bandName: 'Green', bandColor: 'green', minScore: 0, maxScore: 39, description: 'Low risk' },
          { bandName: 'Yellow', bandColor: 'yellow', minScore: 40, maxScore: 69, description: 'Medium risk' },
          { bandName: 'Red', bandColor: 'red', minScore: 70, maxScore: 100, description: 'High risk' },
        ],
      });
    }
  }
  console.log('Risk Configs ready.');

  // 4. Audit Plan (FY2025-26, Approved) + items
  const fy = await FinancialYear.findOne({ code: 'FY2025-26' });
  const admin = await User.findOne({ employeeCode: 'ADMIN' });
  const bm1 = await User.findOne({ employeeCode: 'BM001' });
  const bm2 = await User.findOne({ employeeCode: 'BM002' });
  const mandaliType = await AuditType.findOne({ code: 'MANDALI_DAFTAR_TAPASANI' });
  const inspectionType = await AuditType.findOne({ code: 'INTERNAL_INSPECTION_MEMO' });

  let plan = await AuditPlan.findOne({ financialYear: fy._id });
  if (!plan) {
    plan = await AuditPlan.create({
      financialYear: fy._id,
      status: 'Approved',
      createdBy: admin._id,
      approvedBy: admin._id,
      approvedAt: new Date(),
    });
    console.log('Created Audit Plan (FY2025-26, Approved).');
  } else {
    console.log('Audit Plan exists.');
  }

  const existingItems = await AuditPlanItem.countDocuments({ plan: plan._id });
  if (existingItems === 0) {
    const pacs1 = await PACS.find({ linkedBranch: bm1.branch }).sort({ name: 1 });
    const pacs2 = await PACS.find({ linkedBranch: bm2.branch }).sort({ name: 1 });
    const items = [];
    const fyFrom = new Date('2025-04-01');
    const fyTo = new Date('2026-03-31');
    if (pacs1[0]) {
      items.push({ plan: plan._id, auditType: mandaliType._id, entityType: 'PACS', entityId: pacs1[0]._id, periodFrom: fyFrom, periodTo: fyTo, plannedStart: new Date('2025-06-01'), plannedEnd: new Date('2025-06-15'), assignedTo: bm1._id, priority: 'High', status: 'InProgress' });
      items.push({ plan: plan._id, auditType: inspectionType._id, entityType: 'PACS', entityId: pacs1[0]._id, periodFrom: fyFrom, periodTo: fyTo, plannedStart: new Date('2025-09-01'), plannedEnd: new Date('2025-09-15'), assignedTo: bm1._id, priority: 'Medium', status: 'Planned' });
    }
    if (pacs2[0]) {
      items.push({ plan: plan._id, auditType: mandaliType._id, entityType: 'PACS', entityId: pacs2[0]._id, periodFrom: fyFrom, periodTo: fyTo, plannedStart: new Date('2025-06-01'), plannedEnd: new Date('2025-06-15'), assignedTo: bm2._id, priority: 'High', status: 'InProgress' });
      items.push({ plan: plan._id, auditType: inspectionType._id, entityType: 'PACS', entityId: pacs2[0]._id, periodFrom: fyFrom, periodTo: fyTo, plannedStart: new Date('2025-09-01'), plannedEnd: new Date('2025-09-15'), assignedTo: bm2._id, priority: 'Medium', status: 'Planned' });
    }
    await AuditPlanItem.insertMany(items);
    console.log(`Created ${items.length} plan items.`);
  } else {
    console.log('Plan items exist.');
  }

  // 5. Observations (for BM001's mandali-daftar audit)
  const obsCount = await Observation.countDocuments();
  if (obsCount === 0) {
    const instance = await AuditInstance.findOne({ startedBy: bm1._id, auditType: mandaliType._id });
    if (instance) {
      await Observation.insertMany([
        { auditInstance: instance._id, fieldCode: 'FLD_MD_SHARE_CERT', sectionCode: 'SEC_MD_SHARE', title: 'Share certificates not issued to all members', description: 'કેટલાક સભાસદોને શેર સર્ટિફિકેટ આપવામાં આવેલ નથી.', severity: 'High', targetDate: new Date('2025-12-31'), status: 'Open' },
        { auditInstance: instance._id, fieldCode: 'FLD_MD_AGM', sectionCode: 'SEC_MD_COMMITTEE', title: 'Annual General Meeting not held on time', description: 'વાર્ષિક સાધારણ સભા મુદતસર મળેલ નથી.', severity: 'Medium', targetDate: new Date('2025-11-30'), status: 'Open' },
        { auditInstance: instance._id, fieldCode: 'FLD_MD_LOAN_RECOVERY', sectionCode: 'SEC_MD_LOAN', title: 'Loan recovery below target', description: 'લોન વસુલાત લક્ષ્ય કરતા ઓછી છે.', severity: 'Critical', targetDate: new Date('2025-10-31'), status: 'Open' },
      ]);
      console.log('Created 3 observations.');
    }
  } else {
    console.log('Observations exist.');
  }

  // 6. Closure Certificate (demo closed audit)
  const certCount = await ClosureCertificate.countDocuments();
  if (certCount === 0) {
    // Mark one instance as Closed and create a certificate
    const instance = await AuditInstance.findOne({ startedBy: bm1._id, auditType: inspectionType._id });
    if (instance) {
      instance.status = 'Closed';
      instance.completedAt = new Date();
      instance.overallRiskScore = 25;
      instance.overallRiskBand = 'Green';
      await instance.save();
      await ClosureCertificate.create({
        auditInstance: instance._id,
        certificateNumber: 'CLS-2025-001',
        generatedAt: new Date(),
        signedBy_hia: admin._id,
        signedBy_auditor: bm1._id,
        remarks: 'All observations rectified. Audit closed.',
      });
      console.log('Created 1 closure certificate (demo closed audit).');
    }
  } else {
    console.log('Closure certificates exist.');
  }

  await mongoose.disconnect();
  console.log('\nDONE');
})().catch((e) => { console.error(e); process.exit(1); });
