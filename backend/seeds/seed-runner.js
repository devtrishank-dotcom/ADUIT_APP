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
const NotificationTemplate = require('../models/NotificationTemplate');

const createBranchAuditTemplate = require('./branch-audit-template.seed');
const createPacsAuditTemplate = require('./pacs-audit-template.seed');

const DROP_EXISTING = process.env.SEED_DROP_DATA === 'true';

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/audit_management');
    console.log('MongoDB connected for seeding.');

    if (DROP_EXISTING) {
      console.log('Dropping existing data...');
      const collections = await mongoose.connection.db.listCollections().toArray();
      for (const col of collections) {
        await mongoose.connection.db.dropCollection(col.name);
      }
      console.log('All collections dropped.');
    }

    // 1. Create DataScopeRules
    console.log('Creating DataScopeRules...');
    const allScope = await DataScopeRule.create({ name: 'All Access', scopeType: 'All' });
    const zoneScope = await DataScopeRule.create({ name: 'Zone Level', scopeType: 'Zone', scopeValue: 'North' });
    const branchScope = await DataScopeRule.create({ name: 'Branch Level', scopeType: 'Branch', scopeValue: null });
    const ownScope = await DataScopeRule.create({ name: 'Own Only', scopeType: 'Own', scopeValue: null });
    console.log('  Created 4 DataScopeRules.');

    // 2. Create Permissions
    console.log('Creating default permissions...');
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
    console.log(`  Created ${createdPerms.length} permissions.`);

    // 3. Create Roles
    console.log('Creating default roles...');

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
    console.log('  Created 7 roles.');

    // 4. Create Branches and PACS
    console.log('Creating sample Branches and PACS...');
    const branches = await Branch.insertMany([
      { code: 'BR001', name: 'Main Branch - Mumbai', zone: 'West', region: 'Maharashtra', address: '123 MG Road, Mumbai', category: 'Main' },
      { code: 'BR002', name: 'Pune Branch', zone: 'West', region: 'Maharashtra', address: '456 FC Road, Pune', category: 'Regional' },
      { code: 'BR003', name: 'Nagpur Branch', zone: 'Central', region: 'Maharashtra', address: '789 Wardha Road, Nagpur', category: 'Regional' },
      { code: 'BR004', name: 'Nashik Branch', zone: 'North', region: 'Maharashtra', address: '101 College Road, Nashik', category: 'District' },
      { code: 'BR005', name: 'Aurangabad Branch', zone: 'Central', region: 'Maharashtra', address: '202 Jalna Road, Aurangabad', category: 'District' },
    ]);
    const pacsList = [
      { name: 'Shivaji PACS Pune', registrationNumber: 'PACS-W-001', linkedBranch: branches[1]._id, taluka: 'Haveli', village: 'Shivajinagar', workArea: 'Pune Rural', status: 'active' },
      { name: 'Gandhi PACS Nagpur', registrationNumber: 'PACS-C-001', linkedBranch: branches[2]._id, taluka: 'Nagpur Rural', village: 'Wardha', workArea: 'Nagpur Rural', status: 'active' },
      { name: 'Ambedkar PACS Nashik', registrationNumber: 'PACS-N-001', linkedBranch: branches[3]._id, taluka: 'Nashik', village: 'Satpur', workArea: 'Nashik Rural', status: 'active' },
      { name: 'Phule PACS Aurangabad', registrationNumber: 'PACS-C-002', linkedBranch: branches[4]._id, taluka: 'Aurangabad', village: 'Beed Bypass', workArea: 'Aurangabad Rural', status: 'active' },
      { name: 'Tilak PACS Mumbai', registrationNumber: 'PACS-W-002', linkedBranch: branches[0]._id, taluka: 'Mumbai Suburban', village: 'Dadar', workArea: 'Mumbai Rural', status: 'active' },
      { name: 'Patel PACS Pune', registrationNumber: 'PACS-W-003', linkedBranch: branches[1]._id, taluka: 'Baramati', village: 'Baramati', workArea: 'Pune Rural', status: 'active' },
      { name: 'Nehru PACS Nagpur', registrationNumber: 'PACS-C-003', linkedBranch: branches[2]._id, taluka: 'Umred', village: 'Umred', workArea: 'Nagpur Rural', status: 'active' },
      { name: 'Sardar PACS Nashik', registrationNumber: 'PACS-N-002', linkedBranch: branches[3]._id, taluka: 'Igatpuri', village: 'Igatpuri', workArea: 'Nashik Rural', status: 'active' },
      { name: 'Shastri PACS Aurangabad', registrationNumber: 'PACS-C-004', linkedBranch: branches[4]._id, taluka: 'Paithan', village: 'Paithan', workArea: 'Aurangabad Rural', status: 'active' },
      { name: 'Bose PACS Mumbai', registrationNumber: 'PACS-W-004', linkedBranch: branches[0]._id, taluka: 'Mumbai City', village: 'Worli', workArea: 'Mumbai Rural', status: 'active' },
    ];
    await PACS.insertMany(pacsList);
    console.log(`  Created ${branches.length} branches and ${pacsList.length} PACS.`);

    // 5. Create FinancialYear
    console.log('Creating FinancialYear...');
    const fy = await FinancialYear.create({
      code: 'FY2025-26',
      startDate: new Date('2025-04-01'),
      endDate: new Date('2026-03-31'),
      isOpen: true,
    });
    console.log('  Created FinancialYear FY2025-26.');

    // 6. Create AuditTypes
    console.log('Creating AuditTypes...');
    const branchAuditType = await AuditType.create({
      code: 'BRANCH_AUDIT',
      name: 'Branch Audit',
      defaultFrequency: 'Annual',
    });
    const pacsAuditType = await AuditType.create({
      code: 'PACS_AUDIT',
      name: 'PACS Audit',
      defaultFrequency: 'Annual',
    });
    console.log('  Created 2 AuditTypes.');

    // 7. Create WorkflowDefinitions
    console.log('Creating WorkflowDefinitions...');
    await WorkflowDefinition.insertMany([
      {
        auditType: branchAuditType._id,
        version: 1,
        status: 'Published',
        subjectType: 'AuditInstance',
        stages: [
          { sequence: 0, name: 'Auditor Submission', actorRole: 'Auditor', actionsAllowed: ['submit'], slaHours: 48 },
          { sequence: 1, name: 'HIA Review', actorRole: 'HIA', actionsAllowed: ['approve', 'return'], slaHours: 72 },
          { sequence: 2, name: 'Approved', actorRole: 'HIA', actionsAllowed: [], slaHours: 0 },
        ],
      },
      {
        auditType: pacsAuditType._id,
        version: 1,
        status: 'Published',
        subjectType: 'AuditInstance',
        stages: [
          { sequence: 0, name: 'Auditor Submission', actorRole: 'Auditor', actionsAllowed: ['submit'], slaHours: 48 },
          { sequence: 1, name: 'HIA Review', actorRole: 'HIA', actionsAllowed: ['approve', 'return'], slaHours: 72 },
          { sequence: 2, name: 'Approved', actorRole: 'HIA', actionsAllowed: [], slaHours: 0 },
        ],
      },
    ]);
    console.log('  Created 2 WorkflowDefinitions.');

    // 8. Create seed templates (OptionList OL_COMPLIANCE_STATUS, then templates)
    console.log('Creating seed templates...');
    await OptionList.create({
      code: 'OL_COMPLIANCE_STATUS',
      name: 'Compliance Status',
      isShared: true,
      items: [
        { value: 'COMPLIED', labelEn: 'Complied', riskPoints: 0, severity: 'None', sequence: 1 },
        { value: 'PARTIALLY_COMPLIED', labelEn: 'Partially Complied', riskPoints: 3, severity: 'Medium', sequence: 2 },
        { value: 'NOT_COMPLIED', labelEn: 'Not Complied', riskPoints: 5, severity: 'High', sequence: 3 },
        { value: 'NOT_APPLICABLE', labelEn: 'Not Applicable', riskPoints: 0, severity: 'None', sequence: 4 },
      ],
    });
    await createBranchAuditTemplate(branchAuditType);
    await createPacsAuditTemplate(pacsAuditType);
    console.log('  Seed templates created.');

    // 9. Create Users
    console.log('Creating sample users...');
    const salt = await bcrypt.genSalt(10);
    const allRoles = await Role.find();

    const getRoleId = (name) => allRoles.find((r) => r.name === name)._id;

    const usersData = [
      { employeeCode: 'EMP001', name: 'Admin User', email: 'admin@dccb.gov.in', password: 'admin123', branch: branches[0]._id, department: 'IT', designation: 'System Administrator', roles: [getRoleId('System Administrator')] },
      { employeeCode: 'EMP002', name: 'HIA Officer', email: 'hia@dccb.gov.in', password: 'hia123', branch: branches[0]._id, department: 'Internal Audit', designation: 'Head of Internal Audit', roles: [getRoleId('HIA')] },
      { employeeCode: 'EMP003', name: 'Audit Planner', email: 'planner@dccb.gov.in', password: 'planner123', branch: branches[0]._id, department: 'Internal Audit', designation: 'Audit Planner', roles: [getRoleId('Audit Planner')] },
      { employeeCode: 'EMP004', name: 'Field Auditor', email: 'auditor@dccb.gov.in', password: 'auditor123', branch: branches[1]._id, department: 'Internal Audit', designation: 'Auditor', roles: [getRoleId('Auditor')] },
      { employeeCode: 'EMP005', name: 'Branch Manager Pune', email: 'bm@dccb.gov.in', password: 'bm123', branch: branches[1]._id, department: 'Operations', designation: 'Branch Manager', roles: [getRoleId('Branch Manager')] },
      { employeeCode: 'EMP006', name: 'Compliance Officer', email: 'compliance@dccb.gov.in', password: 'comp123', branch: branches[0]._id, department: 'Compliance', designation: 'Compliance Owner', roles: [getRoleId('Compliance Owner')] },
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
    console.log(`  Created ${usersData.length} sample users.`);

    // 10. Create default notification templates
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
    console.log('  Created default notification templates.');

    console.log('\nSeeding completed successfully!');
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
