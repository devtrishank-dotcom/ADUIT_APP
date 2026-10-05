const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const Role = require('../models/Role');
require('../models/DataScopeRule');

// Report codes each role should be able to open.
const REPORT_ACCESS = {
  'System Administrator': [],
  'HIA': ['planVsActual', 'observationRegister', 'riskTrend', 'complianceAgeing', 'hiaDashboard', 'auditorDashboard', 'branchManagerDashboard', 'auditRegister', 'complianceRegister', 'closureRegister', 'planningRegister'],
  'Audit Planner': ['planVsActual', 'observationRegister', 'riskTrend', 'complianceAgeing', 'branchManagerDashboard', 'auditRegister', 'planningRegister'],
  'Auditor': ['planVsActual', 'observationRegister', 'riskTrend', 'complianceAgeing', 'auditorDashboard', 'branchManagerDashboard', 'auditRegister', 'complianceRegister', 'closureRegister'],
  'Branch Manager': ['planVsActual', 'observationRegister', 'riskTrend', 'complianceAgeing', 'branchManagerDashboard', 'auditRegister', 'complianceRegister', 'closureRegister'],
  'Compliance Owner': ['planVsActual', 'observationRegister', 'complianceAgeing', 'branchManagerDashboard', 'auditRegister', 'complianceRegister', 'closureRegister'],
  'Board Member': ['planVsActual', 'observationRegister', 'riskTrend', 'complianceAgeing', 'hiaDashboard', 'complianceRegister', 'closureRegister'],
};

// Extra (module -> actions) merged into each role's existing permissions.
const EXTRA_PERMS = {
  'System Administrator': {},
  'HIA': { workflows: ['view'], riskConfigs: ['view'], valueStatements: ['view'], optionLists: ['view'] },
  'Audit Planner': { audit: ['view'], compliance: ['view'], closure: ['view'], reports: ['view', 'export'] },
  'Auditor': { planning: ['view'], reports: ['view', 'export'], compliance: ['view'], closure: ['view'] },
  'Branch Manager': { reports: ['view', 'export'], audit: ['view', 'create', 'update'], planning: ['view'], templates: ['view'], masters: ['view'], closure: ['view'] },
  'Compliance Owner': { audit: ['view'], masters: ['view'], reports: ['view', 'export'] },
  'Board Member': { audit: ['view'], masters: ['view'], reports: ['view', 'export'] },
};

const alias = (a) => ({ read: 'view', update: 'edit' }[a] || a);

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const roles = await Role.find();

  for (const role of roles) {
    const perms = role.permissions.map((p) => p.toObject ? p.toObject() : { ...p });
    const byModule = {};
    perms.forEach((p) => {
      const set = new Set((p.actions || []).map(alias));
      byModule[p.module] = byModule[p.module] ? new Set([...byModule[p.module], ...set]) : set;
    });

    const extra = EXTRA_PERMS[role.name] || {};
    Object.entries(extra).forEach(([mod, acts]) => {
      byModule[mod] = byModule[mod] || new Set();
      acts.forEach((a) => byModule[mod].add(alias(a)));
    });

    // Every module should be viewable + exports allowed so PDF buttons work.
    ['reports', 'audit', 'planning', 'compliance', 'closure'].forEach((mod) => {
      byModule[mod] = byModule[mod] || new Set();
      byModule[mod].add('view');
    });
    ['reports', 'audit', 'compliance', 'closure'].forEach((mod) => {
      if (byModule[mod]) byModule[mod].add('export');
    });

    role.permissions = Object.entries(byModule).map(([module, set]) => ({ module, actions: [...set] }));
    role.reportAccess = REPORT_ACCESS[role.name] ?? [];
    role.markModified('permissions');
    role.markModified('reportAccess');
    await role.save();
    console.log(`${role.name}: modules=${Object.keys(byModule).length} reports=${role.reportAccess.length || 'ALL'}`);
  }

  await mongoose.disconnect();
  console.log('\nDONE');
})().catch((e) => { console.error(e); process.exit(1); });