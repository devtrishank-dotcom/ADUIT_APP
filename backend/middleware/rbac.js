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

module.exports = { checkPermission, applyDataScope };
