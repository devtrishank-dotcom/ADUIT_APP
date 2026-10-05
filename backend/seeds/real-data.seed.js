const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const DataScopeRule = require('../models/DataScopeRule');
const Branch = require('../models/Branch');
const PACS = require('../models/PACS');
const FinancialYear = require('../models/FinancialYear');
const AuditType = require('../models/AuditType');
const WorkflowDefinition = require('../models/WorkflowDefinition');
const OptionList = require('../models/OptionList');
const Template = require('../models/Template');
const AuditPlan = require('../models/AuditPlan');
const AuditPlanItem = require('../models/AuditPlanItem');
const AuditInstance = require('../models/AuditInstance');
const AuditResponse = require('../models/AuditResponse');
const Observation = require('../models/Observation');
const ComplianceAction = require('../models/ComplianceAction');
const WorkflowInstance = require('../models/WorkflowInstance');
const WorkflowTransitionLog = require('../models/WorkflowTransitionLog');
const NotificationTemplate = require('../models/NotificationTemplate');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/audit_management');
    console.log('MongoDB connected for real data seeding.');

    // Drop all existing data
    console.log('Dropping existing data...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const col of collections) {
      await mongoose.connection.db.dropCollection(col.name);
    }
    console.log('All collections dropped.');

    // 1. DataScopeRules
    console.log('Creating DataScopeRules...');
    const allScope = await DataScopeRule.create({ name: 'All Access', scopeType: 'All' });
    const zoneScope = await DataScopeRule.create({ name: 'Zone Level', scopeType: 'Zone', scopeValue: 'Junagadh' });
    const branchScope = await DataScopeRule.create({ name: 'Branch Level', scopeType: 'Branch', scopeValue: null });
    const ownScope = await DataScopeRule.create({ name: 'Own Only', scopeType: 'Own', scopeValue: null });

    // 2. Permissions
    console.log('Creating permissions...');
    const modules = ['users', 'rbac', 'masters', 'templates', 'planning', 'audit', 'compliance', 'closure', 'reports', 'notifications'];
    const actions = ['create', 'read', 'update', 'delete'];
    const perms = [];
    for (const mod of modules) {
      for (const act of actions) {
        perms.push({
          code: `${mod.toUpperCase()}_${act.toUpperCase()}`,
          name: `${mod} ${act}`,
          module: mod,
          actions: [act],
        });
      }
    }
    const createdPerms = await Permission.insertMany(perms);

    // 3. Roles
    console.log('Creating roles...');
    const adminModules = [
      'dashboard', 'templates', 'masters', 'users', 'rbac',
      'planning', 'audit', 'compliance', 'closure', 'reports',
      'notifications', 'workflows', 'riskConfigs', 'valueStatements', 'optionLists',
    ];
    const adminActions = ['view', 'create', 'edit', 'delete', 'approve', 'export', 'configure'];
    const systemAdminPerms = adminModules.map((module) => ({
      module,
      actions: adminActions,
    }));

    const hiaPerms = createdPerms.map((p) => ({
      module: p.module,
      actions: p.module === 'rbac' ? ['read'] : p.actions,
    }));

    const plannerPerms = [
      { module: 'planning', actions: ['read', 'create', 'update', 'delete'] },
      { module: 'templates', actions: ['read'] },
      { module: 'masters', actions: ['read'] },
      { module: 'reports', actions: ['read'] },
    ];

    const auditorPerms = [
      { module: 'audit', actions: ['read', 'create', 'update'] },
      { module: 'templates', actions: ['read'] },
      { module: 'masters', actions: ['read'] },
    ];

    const bmPerms = [
      { module: 'compliance', actions: ['read', 'create', 'update'] },
      { module: 'reports', actions: ['read'] },
    ];

    const compliancePerms = [
      { module: 'compliance', actions: ['read', 'create', 'update'] },
      { module: 'closure', actions: ['read', 'create'] },
      { module: 'reports', actions: ['read'] },
    ];

    const boardPerms = [
      { module: 'reports', actions: ['read'] },
      { module: 'compliance', actions: ['read'] },
      { module: 'closure', actions: ['read'] },
    ];

    await Role.create({ name: 'System Administrator', description: 'Full system access', permissions: systemAdminPerms, dataScopeRule: allScope._id, isSystemRole: true });
    await Role.create({ name: 'HIA', description: 'Head of Internal Audit', permissions: hiaPerms, dataScopeRule: allScope._id, isSystemRole: true });
    await Role.create({ name: 'Audit Planner', description: 'Plans and schedules audits', permissions: plannerPerms, dataScopeRule: zoneScope._id, isSystemRole: true });
    await Role.create({ name: 'Auditor', description: 'Performs field audits', permissions: auditorPerms, dataScopeRule: branchScope._id, isSystemRole: true });
    await Role.create({ name: 'Branch Manager', description: 'Manages branch and compliance', permissions: bmPerms, dataScopeRule: branchScope._id, isSystemRole: true });
    await Role.create({ name: 'Compliance Owner', description: 'Owns compliance closure', permissions: compliancePerms, dataScopeRule: zoneScope._id, isSystemRole: true });
    await Role.create({ name: 'Board Member', description: 'Read-only senior oversight', permissions: boardPerms, dataScopeRule: allScope._id, isSystemRole: true });

    // 4. Branches (Junagadh District - JJS Bank)
    console.log('Creating JJS Bank branches...');
    const branches = await Branch.insertMany([
      { code: 'JJS001', name: 'Junagadh Main Branch', zone: 'Junagadh', region: 'Saurashtra', address: 'Kalwa Chowk, Junagadh - 362001', category: 'Main', status: 'active' },
      { code: 'JJS002', name: 'Veraval Branch', zone: 'Junagadh', region: 'Saurashtra', address: 'Opp. Bus Stand, Veraval - 362265', category: 'Regional', status: 'active' },
      { code: 'JJS003', name: 'Keshod Branch', zone: 'Junagadh', region: 'Saurashtra', address: 'Station Road, Keshod - 362210', category: 'District', status: 'active' },
      { code: 'JJS004', name: 'Mangrol Branch', zone: 'Junagadh', region: 'Saurashtra', address: 'Main Bazaar, Mangrol - 362245', category: 'District', status: 'active' },
      { code: 'JJS005', name: 'Manavadar Branch', zone: 'Junagadh', region: 'Saurashtra', address: 'Gandhi Chowk, Manavadar - 362630', category: 'District', status: 'active' },
      { code: 'JJS006', name: 'Visavadar Branch', zone: 'Junagadh', region: 'Saurashtra', address: 'Market Yard, Visavadar - 362220', category: 'District', status: 'active' },
      { code: 'JJS007', name: 'Malia Branch', zone: 'Junagadh', region: 'Saurashtra', address: 'Bus Stand Road, Malia - 362235', category: 'District', status: 'active' },
      { code: 'JJS008', name: 'Vanthali Branch', zone: 'Junagadh', region: 'Saurashtra', address: 'Near Bus Stand, Vanthali - 362250', category: 'District', status: 'active' },
    ]);

    // 5. PACS (Mandali) - Real Junagadh area societies
    console.log('Creating PACS (Mandali)...');
    const pacsList = await PACS.insertMany([
      { name: 'શ્રી જૂનાગઢ તાલુકા સહકારી મંડળી', registrationNumber: 'JJS/M-001', linkedBranch: branches[0]._id, taluka: 'Junagadh', village: 'Junagadh', workArea: 'Junagadh Taluka', status: 'active' },
      { name: 'વેરાવળ સહકારી મંડળી લિ.', registrationNumber: 'JJS/M-002', linkedBranch: branches[1]._id, taluka: 'Kodinar', village: 'Veraval', workArea: 'Veraval', status: 'active' },
      { name: 'કેશોદ તાલુકા મંડળી', registrationNumber: 'JJS/M-003', linkedBranch: branches[2]._id, taluka: 'Keshod', village: 'Keshod', workArea: 'Keshod Taluka', status: 'active' },
      { name: 'માંગરોળ સહકારી મંડળી', registrationNumber: 'JJS/M-004', linkedBranch: branches[3]._id, taluka: 'Mangrol', village: 'Mangrol', workArea: 'Mangrol Taluka', status: 'active' },
      { name: 'માણાવદર મંડળી લિ.', registrationNumber: 'JJS/M-005', linkedBranch: branches[4]._id, taluka: 'Manavadar', village: 'Manavadar', workArea: 'Manavadar Taluka', status: 'active' },
      { name: 'વિસાવદર સહકારી મંડળી', registrationNumber: 'JJS/M-006', linkedBranch: branches[5]._id, taluka: 'Visavadar', village: 'Visavadar', workArea: 'Visavadar Taluka', status: 'active' },
      { name: 'માળિયા હાટીના મંડળી', registrationNumber: 'JJS/M-007', linkedBranch: branches[6]._id, taluka: 'Malia', village: 'Malia Hatina', workArea: 'Malia Taluka', status: 'active' },
      { name: 'વંથલી તાલુકા મંડળી', registrationNumber: 'JJS/M-008', linkedBranch: branches[7]._id, taluka: 'Vanthali', village: 'Vanthali', workArea: 'Vanthali Taluka', status: 'active' },
      { name: 'શ્રી સોમનાથ મંડળી', registrationNumber: 'JJS/M-009', linkedBranch: branches[1]._id, taluka: 'Kodinar', village: 'Prabhas Patan', workArea: 'Somnath', status: 'active' },
      { name: 'તળાજા મંડળી લિ.', registrationNumber: 'JJS/M-010', linkedBranch: branches[0]._id, taluka: 'Junagadh', village: 'Talaja', workArea: 'Talaja', status: 'active' },
    ]);

    // 6. Financial Year
    console.log('Creating Financial Year...');
    const fy = await FinancialYear.create({
      code: 'FY2025-26',
      startDate: new Date('2025-04-01'),
      endDate: new Date('2026-03-31'),
      isOpen: true,
    });

    // 7. Audit Types
    console.log('Creating Audit Types...');
    const branchAuditType = await AuditType.create({
      code: 'BRANCH_AUDIT',
      name: 'Branch Audit',
      nameGu: 'બ્રાન્ચ ઓડિટ',
      defaultFrequency: 'Annual',
    });
    const pacsAuditType = await AuditType.create({
      code: 'PACS_AUDIT',
      name: 'PACS/Mandali Audit',
      nameGu: 'મંડળી ઓડિટ',
      defaultFrequency: 'Annual',
    });

    // 8. Option Lists
    console.log('Creating Option Lists...');
    const olCompliance = await OptionList.create({
      code: 'OL_COMPLIANCE_STATUS',
      name: 'Compliance Status',
      nameGu: 'પાલન સ્થિતિ',
      isShared: true,
      items: [
        { value: 'COMPLIED', labelEn: 'Complied', labelGu: 'પાલન થયેલ', riskPoints: 0, severity: 'None', sequence: 1 },
        { value: 'PARTIALLY_COMPLIED', labelEn: 'Partially Complied', labelGu: 'આંશિક પાલન', riskPoints: 3, severity: 'Medium', sequence: 2 },
        { value: 'NOT_COMPLIED', labelEn: 'Not Complied', labelGu: 'પાલન ન થયેલ', riskPoints: 5, severity: 'High', sequence: 3 },
        { value: 'NOT_APPLICABLE', labelEn: 'Not Applicable', labelGu: 'લાગુ નથી', riskPoints: 0, severity: 'None', sequence: 4 },
      ],
    });

    await OptionList.create({
      code: 'OL_SEVERITY',
      name: 'Severity Levels',
      nameGu: 'તીવ્રતા સ્તર',
      isShared: true,
      items: [
        { value: 'LOW', labelEn: 'Low', labelGu: 'ઓછી', sequence: 1 },
        { value: 'MEDIUM', labelEn: 'Medium', labelGu: 'મધ્યમ', sequence: 2 },
        { value: 'HIGH', labelEn: 'High', labelGu: 'ઉચ્ચ', sequence: 3 },
        { value: 'CRITICAL', labelEn: 'Critical', labelGu: 'ગંભીર', sequence: 4 },
      ],
    });

    await OptionList.create({
      code: 'OL_YES_NO',
      name: 'Yes/No',
      nameGu: 'હા/ના',
      isShared: true,
      items: [
        { value: 'YES', labelEn: 'Yes', labelGu: 'હા', riskPoints: 0, severity: 'None', sequence: 1 },
        { value: 'NO', labelEn: 'No', labelGu: 'ના', riskPoints: 5, severity: 'High', sequence: 2 },
      ],
    });

    // 9. Workflow Definitions
    console.log('Creating Workflow Definitions...');
    const branchWorkflow = await WorkflowDefinition.create({
      auditType: branchAuditType._id,
      version: 1,
      status: 'Published',
      subjectType: 'AuditInstance',
      stages: [
        { sequence: 0, name: 'Auditor Submission', actorRole: 'Auditor', actionsAllowed: ['submit'], slaHours: 48 },
        { sequence: 1, name: 'HIA Review', actorRole: 'HIA', actionsAllowed: ['approve', 'return'], slaHours: 72 },
        { sequence: 2, name: 'Approved', actorRole: 'HIA', actionsAllowed: [], slaHours: 0 },
      ],
    });
    const pacsWorkflow = await WorkflowDefinition.create({
      auditType: pacsAuditType._id,
      version: 1,
      status: 'Published',
      subjectType: 'AuditInstance',
      stages: [
        { sequence: 0, name: 'Auditor Submission', actorRole: 'Auditor', actionsAllowed: ['submit'], slaHours: 48 },
        { sequence: 1, name: 'HIA Review', actorRole: 'HIA', actionsAllowed: ['approve', 'return'], slaHours: 72 },
        { sequence: 2, name: 'Approved', actorRole: 'HIA', actionsAllowed: [], slaHours: 0 },
      ],
    });

    // 10. Templates - Branch Audit (based on Inspection Memo PDF)
    console.log('Creating Branch Audit Template...');
    const branchTemplate = await Template.create({
      auditType: branchAuditType._id,
      version: 1,
      status: 'Published',
      publishedAt: new Date(),
      sections: [
        {
          code: 'SEC_BRANCH_HEADER',
          titleEn: 'Branch & Inspection Header',
          titleGu: 'બ્રાન્ચ અને તપાસ માહિતી',
          sequence: 1,
          fields: [
            { code: 'FLD_BRANCH_NAME', labelEn: 'Branch Name', labelGu: 'બ્રાન્ચનું નામ', fieldType: 'TEXT_SHORT', isMandatory: true, sequence: 1 },
            { code: 'FLD_INSPECTING_OFFICER', labelEn: 'Inspecting Officer', labelGu: 'તપાસ કરનાર અધિકારી', fieldType: 'TEXT_SHORT', isMandatory: true, sequence: 2 },
            { code: 'FLD_INSPECTION_DATE', labelEn: 'Inspection Date', labelGu: 'તપાસની તારીખ', fieldType: 'DATE', isMandatory: true, sequence: 3 },
            { code: 'FLD_PERIOD_FROM', labelEn: 'Period From', labelGu: 'ગાળો શરૂ', fieldType: 'DATE', isMandatory: true, sequence: 4 },
            { code: 'FLD_PERIOD_TO', labelEn: 'Period To', labelGu: 'ગાળો પૂરો', fieldType: 'DATE', isMandatory: true, sequence: 5 },
          ],
        },
        {
          code: 'SEC_CASH_SILAK',
          titleEn: 'Cash & Silak Verification',
          titleGu: 'રોકડ અને સિલક તપાસ',
          sequence: 2,
          fields: [
            { code: 'FLD_CASH_ON_HAND', labelEn: 'Cash on Hand', labelGu: 'રોકડ રકમ', fieldType: 'CURRENCY', isMandatory: true, sequence: 1 },
            { code: 'FLD_WITHIN_CASH_LIMIT', labelEn: 'Within Cash Holding Limit', labelGu: 'રોકડ મર્યાદામાં', fieldType: 'DROPDOWN', optionListId: olCompliance._id, isMandatory: true, sequence: 2 },
            { code: 'FLD_SHORTAGE_REASON', labelEn: 'Reason for Shortage/Excess', labelGu: 'ઉણપ/વધારાનું કારણ', fieldType: 'TEXT_LONG', visibilityRule: 'FLD_WITHIN_CASH_LIMIT!=COMPLIED', sequence: 3 },
            {
              code: 'FLD_DENOMINATION_GRID', labelEn: 'Denomination Details', labelGu: 'ચલણ વિગત', fieldType: 'GRID', sequence: 4,
              gridColumns: [
                { code: 'COL_DENOMINATION', labelEn: 'Denomination', labelGu: 'ચલણ', columnType: 'TEXT_SHORT', sequence: 1 },
                { code: 'COL_COUNT', labelEn: 'Count', labelGu: 'સંખ્યા', columnType: 'NUMBER', sequence: 2 },
                { code: 'COL_AMOUNT', labelEn: 'Amount (INR)', labelGu: 'રકમ (રૂ.)', columnType: 'CURRENCY', sequence: 3 },
              ],
              seedRows: [
                { denomination: '500', count: '', amount: '' },
                { denomination: '200', count: '', amount: '' },
                { denomination: '100', count: '', amount: '' },
                { denomination: '50', count: '', amount: '' },
                { denomination: '20', count: '', amount: '' },
                { denomination: '10', count: '', amount: '' },
                { denomination: '5', count: '', amount: '' },
                { denomination: 'Coin', count: '', amount: '' },
              ],
            },
          ],
        },
        {
          code: 'SEC_KEY_REGISTER',
          titleEn: 'Key Register, Cash Scroll & Day Book',
          titleGu: 'કી રજિસ્ટર, રોકડ સ્ક્રોલ અને દૈનિક બહી',
          sequence: 3,
          fields: [
            { code: 'FLD_KEY_REGISTER_MAINT', labelEn: 'Key Register maintained properly', labelGu: 'કી રજિસ્ટર યોગ્ય રીતે જાળવેલ', fieldType: 'RADIO_YN', isMandatory: true, sequence: 1 },
            { code: 'FLD_CASH_SCROLL_MAINT', labelEn: 'Cash Scroll maintained properly', labelGu: 'રોકડ સ્ક્રોલ યોગ્ય રીતે જાળવેલ', fieldType: 'RADIO_YN', isMandatory: true, sequence: 2 },
            { code: 'FLD_DAY_BOOK_MAINT', labelEn: 'Day Book maintained properly', labelGu: 'દૈનિક બહી યોગ્ય રીતે જાળવેલ', fieldType: 'RADIO_YN', isMandatory: true, sequence: 3 },
            { code: 'FLD_POSTING_DAILY', labelEn: 'Daily posting up to date', labelGu: 'દૈનિક નોંધ અપડેટ', fieldType: 'RADIO_YN', isMandatory: true, sequence: 4 },
            { code: 'FLD_SIGN_VERIFY', labelEn: 'Signatures verified by officer', labelGu: 'અધિકારી દ્વારા સહી ચકાસેલ', fieldType: 'RADIO_YN', sequence: 5 },
          ],
        },
        {
          code: 'SEC_INTERBANK',
          titleEn: 'Inter-bank Balances & Reconciliation',
          titleGu: 'આંતર-બેંક બાકી અને સમાધાન',
          sequence: 4,
          fields: [
            { code: 'FLD_IBB_AMOUNT', labelEn: 'Inter-bank Balance Amount', labelGu: 'આંતર-બેંક બાકી રકમ', fieldType: 'CURRENCY', sequence: 1 },
            { code: 'FLD_IBB_RECON_DATE', labelEn: 'Last Reconciliation Date', labelGu: 'છેલ્લી સમાધાન તારીખ', fieldType: 'DATE', sequence: 2 },
            { code: 'FLD_IBB_DISCREPANCY', labelEn: 'Discrepancy Details', labelGu: 'વિસંગતતા વિગત', fieldType: 'TEXT_LONG', sequence: 3 },
          ],
        },
        {
          code: 'SEC_KYC',
          titleEn: 'Account Opening & KYC',
          titleGu: 'ખાતું ખોલવું અને KYC',
          sequence: 5,
          fields: [
            { code: 'FLD_KYC_COMPLIANT', labelEn: 'KYC Compliance verified', labelGu: 'KYC પાલન ચકાસેલ', fieldType: 'RADIO_YN', isMandatory: true, sequence: 1 },
            { code: 'FLD_KYC_REMARKS', labelEn: 'KYC Verification Remarks', labelGu: 'KYC ચકાસણી ટિપ્પણી', fieldType: 'TEXT_LONG', sequence: 2 },
          ],
        },
        {
          code: 'SEC_LOANS',
          titleEn: 'Loan Accounts & Recovery',
          titleGu: 'લોન ખાતાં અને વસૂલાત',
          sequence: 6,
          fields: [
            { code: 'FLD_TOTAL_LOANS', labelEn: 'Total Loan Accounts', labelGu: 'કુલ લોન ખાતાં', fieldType: 'NUMBER', sequence: 1 },
            { code: 'FLD_NPA_COUNT', labelEn: 'NPA Accounts', labelGu: 'NPA ખાતાં', fieldType: 'NUMBER', sequence: 2 },
            { code: 'FLD_RECOVERY_RATE', labelEn: 'Recovery Rate (%)', labelGu: 'વસૂલાત દર (%)', fieldType: 'PERCENTAGE', sequence: 3 },
            { code: 'FLD_LOAN_REMARKS', labelEn: 'Loan Remarks', labelGu: 'લોન ટિપ્પણી', fieldType: 'TEXT_LONG', sequence: 4 },
          ],
        },
        {
          code: 'SEC_OBSERVATIONS',
          titleEn: 'Key Observations',
          titleGu: 'મુખ્ય અવલોકનો',
          sequence: 7,
          fields: [
            { code: 'FLD_OBS_SUMMARY', labelEn: 'Observation Summary', labelGu: 'અવલોકન સારાંશ', fieldType: 'TEXT_LONG', sequence: 1 },
            { code: 'FLD_RECOMMENDATIONS', labelEn: 'Recommendations', labelGu: 'ભલામણો', fieldType: 'TEXT_LONG', sequence: 2 },
          ],
        },
      ],
    });

    // 11. Template - PACS Audit (based on Madali Daftar Tapasani Yadi PDF)
    console.log('Creating PACS Audit Template...');
    const pacsTemplate = await Template.create({
      auditType: pacsAuditType._id,
      version: 1,
      status: 'Published',
      publishedAt: new Date(),
      sections: [
        {
          code: 'SEC_PACS_HEADER',
          titleEn: 'Society & Inspection Header',
          titleGu: 'મંડળી અને તપાસ માહિતી',
          sequence: 1,
          fields: [
            { code: 'FLD_SOC_NAME', labelEn: 'Society Name', labelGu: 'મંડળીનું નામ', fieldType: 'TEXT_SHORT', isMandatory: true, sequence: 1 },
            { code: 'FLD_REG_NO', labelEn: 'Registration Number', labelGu: 'નોંધણી નંબર', fieldType: 'TEXT_SHORT', isMandatory: true, sequence: 2 },
            { code: 'FLD_INSPECTING_OFFICER', labelEn: 'Inspecting Officer', labelGu: 'તપાસ કરનાર અધિકારી', fieldType: 'TEXT_SHORT', isMandatory: true, sequence: 3 },
            { code: 'FLD_INSPECTION_DATE', labelEn: 'Inspection Date', labelGu: 'તપાસની તારીખ', fieldType: 'DATE', isMandatory: true, sequence: 4 },
            { code: 'FLD_PERIOD_FROM', labelEn: 'Audit Period From', labelGu: 'ઓડિટ ગાળો શરૂ', fieldType: 'DATE', isMandatory: true, sequence: 5 },
            { code: 'FLD_PERIOD_TO', labelEn: 'Audit Period To', labelGu: 'ઓડિટ ગાળો પૂરો', fieldType: 'DATE', isMandatory: true, sequence: 6 },
            { code: 'FLD_LINKED_BRANCH', labelEn: 'Linked Branch', labelGu: 'સંકળાયેલ બ્રાન્ચ', fieldType: 'TEXT_SHORT', sequence: 7 },
          ],
        },
        {
          code: 'SEC_GENERAL_INFO',
          titleEn: 'General Information & Last Audit',
          titleGu: 'સામાન્ય માહિતી અને છેલ્લો ઓડિટ',
          sequence: 2,
          fields: [
            { code: 'FLD_ESTABLISHMENT_DATE', labelEn: 'Society Establishment Date', labelGu: 'મંડળી સ્થાપના તારીખ', fieldType: 'DATE', sequence: 1 },
            { code: 'FLD_MEMBER_COUNT', labelEn: 'Total Members', labelGu: 'કુલ સભ્યો', fieldType: 'NUMBER', sequence: 2 },
            { code: 'FLD_LAST_AUDIT_DATE', labelEn: 'Date of Last Audit', labelGu: 'છેલ્લા ઓડિટની તારીખ', fieldType: 'DATE', sequence: 3 },
            { code: 'FLD_LAST_AUDIT_BY', labelEn: 'Last Audit Conducted By', labelGu: 'છેલ્લો ઓડિટ કોણે કર્યો', fieldType: 'TEXT_SHORT', sequence: 4 },
            { code: 'FLD_LAST_AUDIT_STATUS', labelEn: 'Last Audit Status', labelGu: 'છેલ્લા ઓડિટની સ્થિતિ', fieldType: 'DROPDOWN', optionListId: olCompliance._id, sequence: 5 },
            { code: 'FLD_AGM_DATE', labelEn: 'Last AGM Date', labelGu: 'છેલ્લી સાધારણ સભા તારીખ', fieldType: 'DATE', sequence: 6 },
          ],
        },
        {
          code: 'SEC_PACS_STOCK_SILAK',
          titleEn: 'Stock & Silak Verification',
          titleGu: 'સ્ટોક અને સિલક તપાસ',
          sequence: 3,
          fields: [
            { code: 'FLD_STOCK_CASH_BALANCE', labelEn: 'Cash Balance (as per books)', labelGu: 'રોકડ બાકી (બહી મુજબ)', fieldType: 'CURRENCY', isMandatory: true, sequence: 1 },
            { code: 'FLD_STOCK_PHYSICAL_VERIFIED', labelEn: 'Stock physically verified', labelGu: 'સ્ટોક ભૌતિક ચકાસેલ', fieldType: 'RADIO_YN', isMandatory: true, sequence: 2 },
            { code: 'FLD_STOCK_DISCREPANCY', labelEn: 'Discrepancy Details', labelGu: 'વિસંગતતા વિગત', fieldType: 'TEXT_LONG', sequence: 3 },
            {
              code: 'FLD_STOCK_GRID', labelEn: 'Stock Items', labelGu: 'સ્ટોક વસ્તુઓ', fieldType: 'GRID', sequence: 4,
              gridColumns: [
                { code: 'COL_ITEM_NAME', labelEn: 'Item', labelGu: 'વસ્તુ', columnType: 'TEXT_SHORT', sequence: 1 },
                { code: 'COL_BOOK_QTY', labelEn: 'Book Qty', labelGu: 'બહી જથ્થો', columnType: 'NUMBER', sequence: 2 },
                { code: 'COL_PHYSICAL_QTY', labelEn: 'Physical Qty', labelGu: 'ભૌતિક જથ્થો', columnType: 'NUMBER', sequence: 3 },
                { code: 'COL_VALUE', labelEn: 'Value (INR)', labelGu: 'કિંમત (રૂ.)', columnType: 'CURRENCY', sequence: 4 },
              ],
            },
          ],
        },
        {
          code: 'SEC_MEMBERSHIP',
          titleEn: 'Membership & Premises',
          titleGu: 'સભ્યપદ અને જગ્યા',
          sequence: 4,
          fields: [
            { code: 'FLD_MEMBERSHIP_REGISTER', labelEn: 'Membership Register maintained', labelGu: 'સભ્યપદ રજિસ્ટર જાળવેલ', fieldType: 'RADIO_YN', isMandatory: true, sequence: 1 },
            { code: 'FLD_PREMISES_OWNED', labelEn: 'Premises owned/rented', labelGu: 'જગ્યા માલિકી/ભાડે', fieldType: 'TEXT_SHORT', sequence: 2 },
            { code: 'FLD_OFFICE_CONDITION', labelEn: 'Office condition satisfactory', labelGu: 'ઓફિસ સ્થિતિ સંતોષકારક', fieldType: 'RADIO_YN', sequence: 3 },
          ],
        },
        {
          code: 'SEC_ANNUAL_DEMAND',
          titleEn: 'Annual Demand & Recovery',
          titleGu: 'વાર્ષિક માંગ અને વસૂલાત',
          sequence: 5,
          fields: [
            {
              code: 'FLD_ANNUAL_DEMAND_GRID', labelEn: 'Annual Demand & Recovery', labelGu: 'વાર્ષિક માંગ અને વસૂલાત', fieldType: 'GRID', sequence: 1,
              gridColumns: [
                { code: 'COL_YEAR', labelEn: 'Year', labelGu: 'વર્ષ', columnType: 'TEXT_SHORT', sequence: 1 },
                { code: 'COL_DEMAND', labelEn: 'Demand (INR)', labelGu: 'માંગ (રૂ.)', columnType: 'CURRENCY', sequence: 2 },
                { code: 'COL_RECOVERY', labelEn: 'Recovery (INR)', labelGu: 'વસૂલાત (રૂ.)', columnType: 'CURRENCY', sequence: 3 },
                { code: 'COL_PERCENTAGE', labelEn: 'Recovery %', labelGu: 'વસૂલાત %', columnType: 'PERCENTAGE', sequence: 4 },
              ],
              seedRows: [
                { year: '2023-24', demand: '', recovery: '', percentage: '' },
                { year: '2024-25', demand: '', recovery: '', percentage: '' },
                { year: '2025-26', demand: '', recovery: '', percentage: '' },
              ],
            },
          ],
        },
        {
          code: 'SEC_SHARE_CAPITAL',
          titleEn: 'Share Capital & Share Transactions',
          titleGu: 'શેર મૂડી અને શેર વ્યવહાર',
          sequence: 6,
          fields: [
            { code: 'FLD_SHARE_CAPITAL', labelEn: 'Total Share Capital', labelGu: 'કુલ શેર મૂડી', fieldType: 'CURRENCY', sequence: 1 },
            { code: 'FLD_SHARE_TRANSFERS', labelEn: 'Share transfers properly recorded', labelGu: 'શેર ટ્રાન્સફર યોગ્ય રીતે નોંધેલ', fieldType: 'RADIO_YN', sequence: 2 },
            { code: 'FLD_DIVIDEND_PAID', labelEn: 'Dividend paid last year', labelGu: 'છેલ્લે વર્ષે ડિવિડન્ડ ચૂકવેલ', fieldType: 'CURRENCY', sequence: 3 },
          ],
        },
        {
          code: 'SEC_LOANS_ADVANCES',
          titleEn: 'Loans & Advances',
          titleGu: 'લોન અને ધિરાણ',
          sequence: 7,
          fields: [
            { code: 'FLD_TOTAL_LOAN_ACCOUNTS', labelEn: 'Total Loan Accounts', labelGu: 'કુલ લોન ખાતાં', fieldType: 'NUMBER', sequence: 1 },
            { code: 'FLD_ACTIVE_LOANS', labelEn: 'Active Loan Accounts', labelGu: 'સક્રિય લોન ખાતાં', fieldType: 'NUMBER', sequence: 2 },
            { code: 'FLD_NPA_LOANS', labelEn: 'NPA Loan Accounts', labelGu: 'NPA લોન ખાતાં', fieldType: 'NUMBER', sequence: 3 },
            { code: 'FLD_LOAN_RECOVERY_RATE', labelEn: 'Loan Recovery Rate (%)', labelGu: 'લોન વસૂલાત દર (%)', fieldType: 'PERCENTAGE', sequence: 4 },
            { code: 'FLD_LOAN_REMARKS', labelEn: 'Loan Remarks', labelGu: 'લોન ટિપ્પણી', fieldType: 'TEXT_LONG', sequence: 5 },
          ],
        },
        {
          code: 'SEC_OBSERVATIONS',
          titleEn: 'Key Observations',
          titleGu: 'મુખ્ય અવલોકનો',
          sequence: 8,
          fields: [
            { code: 'FLD_OBS_SUMMARY', labelEn: 'Observation Summary', labelGu: 'અવલોકન સારાંશ', fieldType: 'TEXT_LONG', sequence: 1 },
            { code: 'FLD_RECOMMENDATIONS', labelEn: 'Recommendations', labelGu: 'ભલામણો', fieldType: 'TEXT_LONG', sequence: 2 },
          ],
        },
      ],
    });

    // 12. Users (JJS Bank)
    console.log('Creating JJS Bank users...');
    const salt = await bcrypt.genSalt(10);
    const allRoles = await Role.find();
    const getRoleId = (name) => allRoles.find((r) => r.name === name)._id;

    const usersData = [
      { employeeCode: 'JJS001', name: 'Admin User', email: 'admin@thejjs.bank.in', password: 'admin123', branch: branches[0]._id, department: 'IT', designation: 'System Administrator', roles: [getRoleId('System Administrator')] },
      { employeeCode: 'JJS002', name: 'HIA Officer', email: 'hia@thejjs.bank.in', password: 'hia123', branch: branches[0]._id, department: 'Internal Audit', designation: 'Head of Internal Audit', roles: [getRoleId('HIA')] },
      { employeeCode: 'JJS003', name: 'Audit Planner', email: 'planner@thejjs.bank.in', password: 'planner123', branch: branches[0]._id, department: 'Internal Audit', designation: 'Audit Planner', roles: [getRoleId('Audit Planner')] },
      { employeeCode: 'JJS004', name: 'Field Auditor', email: 'auditor@thejjs.bank.in', password: 'auditor123', branch: branches[0]._id, department: 'Internal Audit', designation: 'Auditor', roles: [getRoleId('Auditor')] },
      { employeeCode: 'JJS005', name: 'Branch Manager Junagadh', email: 'bm.junagadh@thejjs.bank.in', password: 'bm123', branch: branches[0]._id, department: 'Operations', designation: 'Branch Manager', roles: [getRoleId('Branch Manager')] },
      { employeeCode: 'JJS006', name: 'Compliance Officer', email: 'compliance@thejjs.bank.in', password: 'comp123', branch: branches[0]._id, department: 'Compliance', designation: 'Compliance Owner', roles: [getRoleId('Compliance Owner')] },
      { employeeCode: 'JJS007', name: 'Branch Manager Veraval', email: 'bm.veraval@thejjs.bank.in', password: 'bm123', branch: branches[1]._id, department: 'Operations', designation: 'Branch Manager', roles: [getRoleId('Branch Manager')] },
      { employeeCode: 'JJS008', name: 'Branch Manager Keshod', email: 'bm.keshod@thejjs.bank.in', password: 'bm123', branch: branches[2]._id, department: 'Operations', designation: 'Branch Manager', roles: [getRoleId('Branch Manager')] },
    ];

    for (const u of usersData) {
      const passwordHash = await bcrypt.hash(u.password, salt);
      await User.create({
        employeeCode: u.employeeCode,
        name: u.name,
        email: u.email,
        passwordHash,
        branch: u.branch,
        department: u.department,
        designation: u.designation,
        roles: u.roles,
      });
    }

    // 13. Audit Plan
    console.log('Creating Audit Plan...');
    const plannerUser = await User.findOne({ employeeCode: 'JJS003' });
    const hiaUser = await User.findOne({ employeeCode: 'JJS002' });
    const auditPlan = await AuditPlan.create({
      financialYear: fy._id,
      status: 'Approved',
      createdBy: plannerUser._id,
      approvedBy: hiaUser._id,
      approvedAt: new Date('2025-09-15'),
    });

    // 14. Plan Items
    console.log('Creating Plan Items...');
    const auditorUser = await User.findOne({ employeeCode: 'JJS004' });
    const planItems = await AuditPlanItem.insertMany([
      { plan: auditPlan._id, auditType: branchAuditType._id, entityType: 'Branch', entityId: branches[0]._id, periodFrom: new Date('2025-04-01'), periodTo: new Date('2025-09-30'), assignedTo: auditorUser._id, priority: 'High', plannedStart: new Date('2025-10-01'), plannedEnd: new Date('2025-10-15'), status: 'InProgress' },
      { plan: auditPlan._id, auditType: branchAuditType._id, entityType: 'Branch', entityId: branches[1]._id, periodFrom: new Date('2025-04-01'), periodTo: new Date('2025-09-30'), assignedTo: auditorUser._id, priority: 'Medium', plannedStart: new Date('2025-10-16'), plannedEnd: new Date('2025-10-30'), status: 'Planned' },
      { plan: auditPlan._id, auditType: branchAuditType._id, entityType: 'Branch', entityId: branches[2]._id, periodFrom: new Date('2025-04-01'), periodTo: new Date('2025-09-30'), assignedTo: auditorUser._id, priority: 'Medium', plannedStart: new Date('2025-11-01'), plannedEnd: new Date('2025-11-15'), status: 'Planned' },
      { plan: auditPlan._id, auditType: pacsAuditType._id, entityType: 'PACS', entityId: pacsList[0]._id, periodFrom: new Date('2025-04-01'), periodTo: new Date('2025-09-30'), assignedTo: auditorUser._id, priority: 'High', plannedStart: new Date('2025-10-01'), plannedEnd: new Date('2025-10-10'), status: 'InProgress' },
      { plan: auditPlan._id, auditType: pacsAuditType._id, entityType: 'PACS', entityId: pacsList[1]._id, periodFrom: new Date('2025-04-01'), periodTo: new Date('2025-09-30'), assignedTo: auditorUser._id, priority: 'Medium', plannedStart: new Date('2025-10-11'), plannedEnd: new Date('2025-10-20'), status: 'Planned' },
      { plan: auditPlan._id, auditType: pacsAuditType._id, entityType: 'PACS', entityId: pacsList[2]._id, periodFrom: new Date('2025-04-01'), periodTo: new Date('2025-09-30'), assignedTo: auditorUser._id, priority: 'Medium', plannedStart: new Date('2025-10-21'), plannedEnd: new Date('2025-10-30'), status: 'Planned' },
    ]);

    // 15. Audit Instances with real data
    console.log('Creating Audit Instances with responses...');
    const auditor = auditorUser._id;
    const hiaUserObj = await User.findOne({ employeeCode: 'JJS002' });
    const hiaUserId = hiaUserObj._id;

    // Branch Audit - Junagadh Main Branch (InProgress with data)
    const branchAudit = await AuditInstance.create({
      planItem: planItems[0]._id,
      auditType: branchAuditType._id,
      template: branchTemplate._id,
      workflowDef: branchWorkflow._id,
      entityType: 'Branch',
      entityId: branches[0]._id,
      periodFrom: new Date('2025-04-01'),
      periodTo: new Date('2025-09-30'),
      startedBy: auditor,
      startedAt: new Date('2025-10-01'),
      status: 'InProgress',
    });

    // Add responses for branch audit
    await AuditResponse.insertMany([
      { auditInstance: branchAudit._id, sectionCode: 'SEC_BRANCH_HEADER', fieldCode: 'FLD_BRANCH_NAME', value: 'Junagadh Main Branch', updatedBy: auditor },
      { auditInstance: branchAudit._id, sectionCode: 'SEC_BRANCH_HEADER', fieldCode: 'FLD_INSPECTING_OFFICER', value: 'Field Auditor', updatedBy: auditor },
      { auditInstance: branchAudit._id, sectionCode: 'SEC_BRANCH_HEADER', fieldCode: 'FLD_INSPECTION_DATE', value: new Date('2025-10-05'), updatedBy: auditor },
      { auditInstance: branchAudit._id, sectionCode: 'SEC_BRANCH_HEADER', fieldCode: 'FLD_PERIOD_FROM', value: new Date('2025-04-01'), updatedBy: auditor },
      { auditInstance: branchAudit._id, sectionCode: 'SEC_BRANCH_HEADER', fieldCode: 'FLD_PERIOD_TO', value: new Date('2025-09-30'), updatedBy: auditor },
      { auditInstance: branchAudit._id, sectionCode: 'SEC_CASH_SILAK', fieldCode: 'FLD_CASH_ON_HAND', value: 125000, updatedBy: auditor },
      { auditInstance: branchAudit._id, sectionCode: 'SEC_CASH_SILAK', fieldCode: 'FLD_WITHIN_CASH_LIMIT', value: 'COMPLIED', updatedBy: auditor },
      { auditInstance: branchAudit._id, sectionCode: 'SEC_KEY_REGISTER', fieldCode: 'FLD_KEY_REGISTER_MAINT', value: 'YES', updatedBy: auditor },
      { auditInstance: branchAudit._id, sectionCode: 'SEC_KEY_REGISTER', fieldCode: 'FLD_CASH_SCROLL_MAINT', value: 'YES', updatedBy: auditor },
      { auditInstance: branchAudit._id, sectionCode: 'SEC_KEY_REGISTER', fieldCode: 'FLD_DAY_BOOK_MAINT', value: 'YES', updatedBy: auditor },
      { auditInstance: branchAudit._id, sectionCode: 'SEC_KEY_REGISTER', fieldCode: 'FLD_POSTING_DAILY', value: 'YES', updatedBy: auditor },
      { auditInstance: branchAudit._id, sectionCode: 'SEC_KYC', fieldCode: 'FLD_KYC_COMPLIANT', value: 'YES', updatedBy: auditor },
      { auditInstance: branchAudit._id, sectionCode: 'SEC_LOANS', fieldCode: 'FLD_TOTAL_LOANS', value: 245, updatedBy: auditor },
      { auditInstance: branchAudit._id, sectionCode: 'SEC_LOANS', fieldCode: 'FLD_NPA_COUNT', value: 12, updatedBy: auditor },
      { auditInstance: branchAudit._id, sectionCode: 'SEC_LOANS', fieldCode: 'FLD_RECOVERY_RATE', value: 87.5, updatedBy: auditor },
    ]);

    // Add observation for branch audit
    const branchObs = await Observation.create({
      auditInstance: branchAudit._id,
      fieldCode: 'FLD_NPA_COUNT',
      title: 'NPA accounts exceeding threshold',
      titleGu: 'NPA ખાતાં થ્રેશોલ્ડ કરતાં વધુ',
      description: 'NPA accounts are 12 which is above the acceptable limit of 10. Immediate action required for recovery.',
      severity: 'High',
      status: 'Open',
      targetDate: new Date('2025-11-30'),
    });

    // PACS Audit - Junagadh Taluka Mandali (Submitted)
    const pacsAudit = await AuditInstance.create({
      planItem: planItems[3]._id,
      auditType: pacsAuditType._id,
      template: pacsTemplate._id,
      workflowDef: pacsWorkflow._id,
      entityType: 'PACS',
      entityId: pacsList[0]._id,
      periodFrom: new Date('2025-04-01'),
      periodTo: new Date('2025-09-30'),
      startedBy: auditor,
      startedAt: new Date('2025-10-01'),
      submittedAt: new Date('2025-10-10'),
      status: 'Submitted',
    });

    // Add responses for PACS audit
    await AuditResponse.insertMany([
      { auditInstance: pacsAudit._id, sectionCode: 'SEC_PACS_HEADER', fieldCode: 'FLD_SOC_NAME', value: 'શ્રી જૂનાગઢ તાલુકા સહકારી મંડળી', updatedBy: auditor },
      { auditInstance: pacsAudit._id, sectionCode: 'SEC_PACS_HEADER', fieldCode: 'FLD_REG_NO', value: 'JJS/M-001', updatedBy: auditor },
      { auditInstance: pacsAudit._id, sectionCode: 'SEC_PACS_HEADER', fieldCode: 'FLD_INSPECTING_OFFICER', value: 'Field Auditor', updatedBy: auditor },
      { auditInstance: pacsAudit._id, sectionCode: 'SEC_PACS_HEADER', fieldCode: 'FLD_INSPECTION_DATE', value: new Date('2025-10-08'), updatedBy: auditor },
      { auditInstance: pacsAudit._id, sectionCode: 'SEC_PACS_HEADER', fieldCode: 'FLD_PERIOD_FROM', value: new Date('2025-04-01'), updatedBy: auditor },
      { auditInstance: pacsAudit._id, sectionCode: 'SEC_PACS_HEADER', fieldCode: 'FLD_PERIOD_TO', value: new Date('2025-09-30'), updatedBy: auditor },
      { auditInstance: pacsAudit._id, sectionCode: 'SEC_GENERAL_INFO', fieldCode: 'FLD_MEMBER_COUNT', value: 1250, updatedBy: auditor },
      { auditInstance: pacsAudit._id, sectionCode: 'SEC_GENERAL_INFO', fieldCode: 'FLD_LAST_AUDIT_STATUS', value: 'COMPLIED', updatedBy: auditor },
      { auditInstance: pacsAudit._id, sectionCode: 'SEC_PACS_STOCK_SILAK', fieldCode: 'FLD_STOCK_CASH_BALANCE', value: 85000, updatedBy: auditor },
      { auditInstance: pacsAudit._id, sectionCode: 'SEC_PACS_STOCK_SILAK', fieldCode: 'FLD_STOCK_PHYSICAL_VERIFIED', value: 'YES', updatedBy: auditor },
      { auditInstance: pacsAudit._id, sectionCode: 'SEC_MEMBERSHIP', fieldCode: 'FLD_MEMBERSHIP_REGISTER', value: 'YES', updatedBy: auditor },
      { auditInstance: pacsAudit._id, sectionCode: 'SEC_MEMBERSHIP', fieldCode: 'FLD_OFFICE_CONDITION', value: 'YES', updatedBy: auditor },
      { auditInstance: pacsAudit._id, sectionCode: 'SEC_SHARE_CAPITAL', fieldCode: 'FLD_SHARE_CAPITAL', value: 2500000, updatedBy: auditor },
      { auditInstance: pacsAudit._id, sectionCode: 'SEC_LOANS_ADVANCES', fieldCode: 'FLD_TOTAL_LOAN_ACCOUNTS', value: 450, updatedBy: auditor },
      { auditInstance: pacsAudit._id, sectionCode: 'SEC_LOANS_ADVANCES', fieldCode: 'FLD_ACTIVE_LOANS', value: 420, updatedBy: auditor },
      { auditInstance: pacsAudit._id, sectionCode: 'SEC_LOANS_ADVANCES', fieldCode: 'FLD_NPA_LOANS', value: 8, updatedBy: auditor },
      { auditInstance: pacsAudit._id, sectionCode: 'SEC_LOANS_ADVANCES', fieldCode: 'FLD_LOAN_RECOVERY_RATE', value: 92.3, updatedBy: auditor },
    ]);

    // Add observation for PACS audit
    const pacsObs = await Observation.create({
      auditInstance: pacsAudit._id,
      fieldCode: 'FLD_LOAN_RECOVERY_RATE',
      title: 'Loan recovery below target',
      titleGu: 'લોન વસૂલાત લક્ષ્ય કરતાં છી',
      description: 'Recovery rate is 92.3% which is below the target of 95%. Need to improve recovery efforts.',
      severity: 'Medium',
      status: 'Open',
      targetDate: new Date('2025-12-31'),
    });

    // Create workflow instance for PACS audit
    await WorkflowInstance.create({
      subjectType: 'AuditInstance',
      subjectId: pacsAudit._id,
      workflowDef: pacsWorkflow._id,
      currentStageIndex: 1,
      status: 'Active',
      assignedTo: hiaUserId,
    });

    // 16. Notification Templates
    console.log('Creating Notification Templates...');
    await NotificationTemplate.insertMany([
      {
        eventType: 'AUDIT_ASSIGNED',
        title: 'New audit assigned: {{entityName}}',
        messageBody: 'A new audit has been assigned to you for {{entityName}}. Due date: {{dueDate}}.',
        channels: ['IN_APP'],
        active: true,
      },
      {
        eventType: 'AUDIT_SUBMITTED',
        title: 'Audit submitted for review',
        messageBody: 'Audit {{auditId}} for {{entityName}} has been submitted for review.',
        channels: ['IN_APP', 'EMAIL'],
        active: true,
      },
      {
        eventType: 'OBSERVATION_OVERDUE',
        title: 'Observation overdue: {{entityName}}',
        messageBody: 'Observation {{observationCount}} for {{entityName}} is overdue. Please submit rectification.',
        channels: ['IN_APP'],
        active: true,
      },
    ]);

    console.log('\n✅ Real data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Branches: ${branches.length}`);
    console.log(`   - PACS (Mandali): ${pacsList.length}`);
    console.log(`   - Users: ${usersData.length}`);
    console.log(`   - Templates: 2 (Branch + PACS)`);
    console.log(`   - Audit Plan: 1 (FY2025-26)`);
    console.log(`   - Plan Items: ${planItems.length}`);
    console.log(`   - Audit Instances: 2 (1 InProgress, 1 Submitted)`);
    console.log(`   - Observations: 2`);
    console.log('\n🔐 Demo Logins:');
    console.log('   Admin: JJS001 / admin123');
    console.log('   HIA: JJS002 / hia123');
    console.log('   Planner: JJS003 / planner123');
    console.log('   Auditor: JJS004 / auditor123');
    console.log('   Branch Manager: JJS005 / bm123');
    console.log('   Compliance: JJS006 / comp123');

    return true;
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed()
  .then(() => {
    console.log('Seed runner finished.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed runner error:', err);
    process.exit(1);
  });
