const DataScopeRule = require('../models/DataScopeRule');

const SCOPE_PRIORITY = { All: 4, Zone: 3, Branch: 2, PACS: 1, Own: 0 };

const getScopePriority = (scopeType) => SCOPE_PRIORITY[scopeType] || -1;

const normalizeRoleName = (name) => String(name || '').trim().toUpperCase().replace(/\s+/g, '_');

const isAdministrator = (user) => user?.roles?.some((role) => (
  ['SYSTEM_ADMINISTRATOR', 'ADMIN', 'SUPER_ADMIN'].includes(normalizeRoleName(role.name))
));

const normalizeAction = (action) => ({
  read: 'view',
  update: 'edit',
}[String(action || '').toLowerCase()] || String(action || '').toLowerCase());

const checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: 'Authentication required.' });
      }

      if (!user.roles || user.roles.length === 0) {
        return res.status(403).json({ error: 'Access denied. No roles assigned.' });
      }

      if (isAdministrator(user)) {
        req.dataScope = { scopeType: 'All' };
        req.fieldRestrictions = [];
        return next();
      }

      let hasPermission = false;
      let fieldRestrictions = [];
      let broadestScope = null;

      for (const role of user.roles) {
        const perm = role.permissions.find((p) => p.module === module);

        if (!perm || !perm.actions.some((allowedAction) => (
          allowedAction === '*' || normalizeAction(allowedAction) === normalizeAction(action)
        ))) {
          continue;
        }

        hasPermission = true;

        if (perm.fieldRestrictions && perm.fieldRestrictions.length > 0) {
          if (fieldRestrictions.length === 0) {
            fieldRestrictions = perm.fieldRestrictions;
          } else {
            const merged = {};
            for (const fr of fieldRestrictions) {
              merged[fr.fieldCode] = fr;
            }
            for (const fr of perm.fieldRestrictions) {
              if (!merged[fr.fieldCode]) {
                merged[fr.fieldCode] = fr;
              } else {
                merged[fr.fieldCode].canView = merged[fr.fieldCode].canView || fr.canView;
                merged[fr.fieldCode].canEdit = merged[fr.fieldCode].canEdit || fr.canEdit;
              }
            }
            fieldRestrictions = Object.values(merged);
          }
        }

        if (role.dataScopeRule) {
          let scope;
          if (typeof role.dataScopeRule === 'object' && role.dataScopeRule.scopeType) {
            scope = role.dataScopeRule;
          } else {
            scope = await DataScopeRule.findById(role.dataScopeRule);
          }

          if (scope) {
            if (!broadestScope || getScopePriority(scope.scopeType) > getScopePriority(broadestScope.scopeType)) {
              broadestScope = scope;
            }
          }
        }
      }

      if (!hasPermission) {
        return res.status(403).json({
          error: `Access denied. Missing permission: ${module}:${action}`,
        });
      }

      // Resolve "Branch" scope to the user's own branch when no fixed value is set.
      if (broadestScope && broadestScope.scopeType === 'Branch' && broadestScope.scopeValue == null) {
        broadestScope = { scopeType: 'Branch', scopeValue: user.branch };
      }

      req.dataScope = broadestScope;
      req.fieldRestrictions = fieldRestrictions;
      next();
    } catch (error) {
      console.error('RBAC Middleware Error:', error);
      res.status(500).json({ error: 'Internal server error during permission check.' });
    }
  };
};

const applyDataScope = (query, dataScope, entityField = 'branch') => {
  if (!dataScope) {
    return query;
  }

  switch (dataScope.scopeType) {
    case 'All':
      return query;

    case 'Zone':
      return query.where('zone').equals(dataScope.scopeValue);

    case 'Branch':
      return query.where(entityField).equals(dataScope.scopeValue);

    case 'PACS':
      return query.where('pacsId').equals(dataScope.scopeValue);

    case 'Own':
      return query.where('createdBy').equals(dataScope.scopeValue);

    default:
      return query;
  }
};

// Reports the AMS knows about. `code` is what gets stored on Role.reportAccess.
const REPORT_CATALOG = [
  { code: 'planVsActual', module: 'reports', label: 'Plan vs Actual', scope: 'planVsActual' },
  { code: 'observationRegister', module: 'reports', label: 'Observation Register', scope: 'observationRegister' },
  { code: 'riskTrend', module: 'reports', label: 'Risk Trend', scope: 'riskTrend' },
  { code: 'complianceAgeing', module: 'reports', label: 'Compliance Ageing', scope: 'complianceAgeing' },
  { code: 'hiaDashboard', module: 'reports', label: 'HIA Dashboard', scope: 'hiaDashboard' },
  { code: 'auditorDashboard', module: 'reports', label: 'Auditor Dashboard', scope: 'auditorDashboard' },
  { code: 'branchManagerDashboard', module: 'reports', label: 'Branch Manager Dashboard', scope: 'branchManagerDashboard' },
  { code: 'auditRegister', module: 'audit', label: 'Audit Register (list)', scope: 'audit' },
  { code: 'complianceRegister', module: 'compliance', label: 'Compliance Register', scope: 'compliance' },
  { code: 'closureRegister', module: 'closure', label: 'Closure Register', scope: 'closure' },
  { code: 'planningRegister', module: 'planning', label: 'Planning Register', scope: 'planning' },
];

// Resolve the broadest data-scope rule across the user's roles.
const resolveScope = async (user) => {
  let broadestScope = null;
  for (const role of user?.roles || []) {
    if (!role.dataScopeRule) continue;
    let scope = role.dataScopeRule;
    if (typeof scope !== 'object' || !scope.scopeType) {
      scope = await DataScopeRule.findById(scope);
    }
    if (scope && (!broadestScope || getScopePriority(scope.scopeType) > getScopePriority(broadestScope.scopeType))) {
      broadestScope = scope;
    }
  }
  if (broadestScope && broadestScope.scopeType === 'Branch' && broadestScope.scopeValue == null) {
    broadestScope = { scopeType: 'Branch', scopeValue: user.branch };
  }
  return broadestScope;
};

// Gate a single report by its code. Requires the role to hold `module:view`
// (or `module:export` for `requireExport`), and the report code to appear in
// Role.reportAccess when that list is populated. Empty list = all reports.
const checkReportAccess = (reportCode, opts = {}) => {
  const { module = 'reports', requireExport = false } = opts;
  const action = requireExport ? 'export' : 'view';

  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Authentication required.' });

      if (isAdministrator(user)) {
        req.dataScope = { scopeType: 'All' };
        req.fieldRestrictions = [];
        req.reportAccess = new Set(REPORT_CATALOG.map((r) => r.code));
        return next();
      }

      if (!user.roles || user.roles.length === 0) {
        return res.status(403).json({ error: 'Access denied. No roles assigned.' });
      }

      const allowed = new Set();
      let moduleOk = false;
      let fieldRestrictions = [];

      for (const role of user.roles) {
        const perm = role.permissions.find((p) => p.module === module);
        if (perm && perm.actions.some((a) => a === '*' || normalizeAction(a) === normalizeAction(action))) {
          moduleOk = true;
          if (perm.fieldRestrictions?.length) {
            fieldRestrictions = fieldRestrictions.length
              ? fieldRestrictions.concat(perm.fieldRestrictions)
              : perm.fieldRestrictions;
          }
        }

        // Permissions are unioned across roles. An empty list means "no
        // restriction", so it grants every report.
        const list = role.reportAccess || [];
        if (!list.length || list.includes('*')) {
          REPORT_CATALOG.forEach((r) => allowed.add(r.code));
        } else {
          list.forEach((code) => allowed.add(code));
        }
      }

      if (!moduleOk) {
        return res.status(403).json({ error: `Access denied. Missing permission: ${module}:${action}` });
      }

      if (!allowed.has(reportCode)) {
        return res.status(403).json({
          error: `Access denied. "${reportCode}" is not included in your role's report access. Ask an administrator to enable it in Role Master.`,
        });
      }

      req.dataScope = await resolveScope(user);
      req.fieldRestrictions = fieldRestrictions;
      req.reportAccess = allowed;
      next();
    } catch (error) {
      console.error('checkReportAccess Error:', error);
      res.status(500).json({ error: 'Internal server error during permission check.' });
    }
  };
};

module.exports = { checkPermission, applyDataScope, checkReportAccess, resolveScope, REPORT_CATALOG };
