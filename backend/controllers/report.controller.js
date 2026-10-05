const AuditPlanItem = require('../models/AuditPlanItem');
const AuditInstance = require('../models/AuditInstance');
const Observation = require('../models/Observation');
const AuditPlan = require('../models/AuditPlan');
const Template = require('../models/Template');
const Branch = require('../models/Branch');
const PACS = require('../models/PACS');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

// Resolve the branch/PACS ids a request is allowed to see, based on the
// data-scope rule attached to the user's role. Returns null when unrestricted.
async function resolveVisibleEntities(dataScope, user) {
  if (!dataScope || dataScope.scopeType === 'All') return null;

  const branchIds = [];
  const pacsIds = [];

  if (dataScope.scopeType === 'Branch') {
    if (dataScope.scopeValue) branchIds.push(dataScope.scopeValue);
    else if (user?.branch) branchIds.push(user.branch);
  } else if (dataScope.scopeType === 'Zone') {
    const q = dataScope.scopeValue ? { zone: dataScope.scopeValue } : {};
    const branches = await Branch.find(q).select('_id');
    branchIds.push(...branches.map((b) => b._id));
    const pacs = await PACS.find({ linkedBranch: { $in: branchIds } }).select('_id');
    pacsIds.push(...pacs.map((p) => p._id));
  } else if (dataScope.scopeType === 'PACS') {
    if (dataScope.scopeValue) pacsIds.push(dataScope.scopeValue);
  }

  const linkedPacs = await PACS.find({ linkedBranch: { $in: branchIds } }).select('_id');
  pacsIds.push(...linkedPacs.map((p) => p._id));

  return { branchIds: [...new Set(branchIds)], pacsIds: [...new Set(pacsIds)] };
}

// Mongo filter for AuditInstance rows inside the caller's visible scope.
function instanceScopeFilter(visible) {
  if (!visible) return {};
  const or = [];
  if (visible.branchIds.length) or.push({ entityType: 'Branch', entityId: { $in: visible.branchIds } });
  if (visible.pacsIds.length) or.push({ entityType: 'PACS', entityId: { $in: visible.pacsIds } });
  return or.length ? { $or: or } : { _id: null };
}

// AuditInstance ids inside the caller's visible scope.
async function visibleInstanceIds(dataScope, user) {
  const visible = await resolveVisibleEntities(dataScope, user);
  if (!visible) return null;
  return AuditInstance.find(instanceScopeFilter(visible)).select('_id');
}

exports.reportsMeta = async (req, res) => {
  try {
    const { REPORT_CATALOG } = require('../middleware/rbac');
    res.json({ data: REPORT_CATALOG, access: req.reportAccess ? [...req.reportAccess] : null });
  } catch (error) {
    console.error('reportsMeta error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.planVsActual = async (req, res) => {
  try {
    const { financialYear } = req.query;
    let planQuery = {};
    if (financialYear) planQuery.financialYear = financialYear;

    const allowedInstanceIds = await visibleInstanceIds(req.dataScope, req.user);

    const plans = await AuditPlan.find(planQuery);
    const planIds = plans.map((p) => p._id);

    const itemQuery = { plan: { $in: planIds } };
    if (allowedInstanceIds) {
      // Keep items that have no audit instance yet (planned but not started).
      itemQuery.$or = [
        { auditInstance: null },
        { auditInstance: { $exists: false } },
        { auditInstance: { $in: allowedInstanceIds } },
      ];
    }

    const items = await AuditPlanItem.find(itemQuery)
      .populate('auditType', 'name code')
      .populate('assignedTo', 'name employeeCode');

    const byStatus = {};
    for (const item of items) {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    }

    const total = items.length;
    const completed = byStatus.Completed || 0;
    const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    res.json({
      data: {
        totalPlanned: total,
        completed,
        completionPercent,
        byStatus,
        byType: groupBy(items, (i) => i.auditType ? i.auditType.code : 'unknown'),
      },
    });
  } catch (error) {
    console.error('planVsActual error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.observationRegister = async (req, res) => {
  try {
    const { severity, status, entityType, startDate, endDate, page = 1, limit = 50 } = req.query;
    const query = {};

    if (severity) query.severity = severity;
    if (status) query.status = status;

    const instanceFilter = instanceScopeFilter(await resolveVisibleEntities(req.dataScope, req.user));
    if (entityType) instanceFilter.entityType = entityType;

    const instances = await AuditInstance.find(instanceFilter).select('_id');
    const visibleIds = instances.map((i) => i._id);

    if (entityType) {
      query.auditInstance = { $in: visibleIds };
    } else if (!req.dataScope || req.dataScope.scopeType === 'All') {
      // unrestricted
    } else {
      query.auditInstance = { $in: visibleIds };
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const total = await Observation.countDocuments(query);
    const observations = await Observation.find(query)
      .populate({
        path: 'auditInstance',
        select: 'entityType entityId auditType status',
        populate: { path: 'auditType', select: 'name code' },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ data: observations, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    console.error('observationRegister error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.riskTrend = async (req, res) => {
  try {
    const { entityType } = req.query;
    const matchStage = instanceScopeFilter(await resolveVisibleEntities(req.dataScope, req.user));
    if (entityType) matchStage.entityType = entityType;

    const trend = await AuditInstance.aggregate([
      { $match: { ...matchStage, overallRiskScore: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: {
            entityId: '$entityId',
            entityType: '$entityType',
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          avgScore: { $avg: '$overallRiskScore' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({ data: trend });
  } catch (error) {
    console.error('riskTrend error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.complianceAgeing = async (req, res) => {
  try {
    const now = new Date();
    const instanceFilter = instanceScopeFilter(await resolveVisibleEntities(req.dataScope, req.user));
    const scopedInstanceIds = await AuditInstance.find(instanceFilter).select('_id');
    const scopeQuery = {};
    if (req.dataScope && req.dataScope.scopeType !== 'All') {
      scopeQuery.auditInstance = { $in: scopedInstanceIds.map((i) => i._id) };
    }

    const observations = await Observation.find({
      status: { $in: ['Open', 'PartiallyComplied'] },
      ...scopeQuery,
    }).populate({
      path: 'auditInstance',
      select: 'entityType entityId',
    });

    const entityMap = {};
    for (const obs of observations) {
      const days = Math.floor((now - obs.createdAt) / (1000 * 60 * 60 * 24));
      const bucket = days <= 7 ? '0-7' : days <= 15 ? '8-15' : days <= 30 ? '16-30' : '30+';
      const entityId = obs.auditInstance ? obs.auditInstance.entityId.toString() : 'unknown';

      if (!entityMap[entityId]) {
        entityMap[entityId] = {
          entityType: obs.auditInstance ? obs.auditInstance.entityType : '',
          total: 0,
          '0-7': 0,
          '8-15': 0,
          '16-30': 0,
          '30+': 0,
        };
      }
      entityMap[entityId][bucket]++;
      entityMap[entityId].total++;
    }

    res.json({ data: Object.entries(entityMap).map(([id, val]) => ({ entityId: id, ...val })) });
  } catch (error) {
    console.error('complianceAgeing error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.hiaDashboard = async (req, res) => {
  try {
    const instanceFilter = instanceScopeFilter(await resolveVisibleEntities(req.dataScope, req.user));
    const visible = await AuditInstance.find(instanceFilter).select('_id');
    const visibleIds = visible.map((i) => i._id);
    const scopeOn = req.dataScope && req.dataScope.scopeType !== 'All';
    const inScope = (extra = {}) => AuditInstance.countDocuments({ ...instanceFilter, ...extra });

    const [totalAudits, completed, pending] = await Promise.all([
      inScope(),
      inScope({ status: 'Closed' }),
      inScope({ status: { $nin: ['Closed', 'Draft'] } }),
    ]);

    const overdueObservations = await Observation.countDocuments({
      ...(scopeOn ? { auditInstance: { $in: visibleIds } } : {}),
      status: { $in: ['Open', 'PartiallyComplied'] },
      targetDate: { $lt: new Date() },
    });

    const riskDist = await AuditInstance.aggregate([
      { $match: { ...instanceFilter, overallRiskBand: { $exists: true, $ne: null } } },
      { $group: { _id: '$overallRiskBand', count: { $sum: 1 } } },
    ]);

    const [totalTemplates, totalBranches, totalPacs, totalUsers, recentActivity] = await Promise.all([
      Template.countDocuments({ status: { $ne: 'Archived' } }),
      Branch.countDocuments({ status: 'active' }),
      PACS.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'active' }),
      ActivityLog.find().sort({ createdAt: -1 }).limit(8).populate('actorUser', 'name employeeCode'),
    ]);

    const completedInstances = await AuditInstance.find({
      ...instanceFilter,
      status: 'Closed',
      completedAt: { $exists: true },
    }).select('createdAt completedAt');
    let avgTimeToClose = 0;
    if (completedInstances.length > 0) {
      const totalDays = completedInstances.reduce((sum, inst) => {
        return sum + ((inst.completedAt - inst.createdAt) / (1000 * 60 * 60 * 24));
      }, 0);
      avgTimeToClose = Math.round(totalDays / completedInstances.length);
    }

    res.json({
      data: {
        totalAudits,
        completed,
         pending,
         overdueCompliance: overdueObservations,
         totalTemplates,
         totalBranches,
         totalPacs,
         totalUsers,
         riskDistribution: riskDist.map((item) => ({
           name: item._id,
           value: item.count,
         })),
         recentActivity: recentActivity.map((item) => ({
           ...item.toObject(),
           actorName: item.actorUser?.name || item.actorUser?.employeeCode,
         })),
         averageTimeToCloseDays: avgTimeToClose,
      },
    });
  } catch (error) {
    console.error('hiaDashboard error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.auditorDashboard = async (req, res) => {
  try {
    const auditorId = req.query.auditorId || req.user._id;
    const instances = await AuditInstance.find({ startedBy: auditorId });
    const instanceIds = instances.map((i) => i._id);

    const total = instances.length;
    const completed = instances.filter((i) => i.status === 'Closed').length;
    const inProgress = instances.filter((i) => !['Closed', 'Draft'].includes(i.status)).length;
    const draft = instances.filter((i) => i.status === 'Draft').length;

    const observations = await Observation.find({ auditInstance: { $in: instanceIds } });
    const obsTotal = observations.length;
    const obsOpen = observations.filter((o) => o.status === 'Open').length;
    const obsVerified = observations.filter((o) => o.status === 'Verified').length;

    res.json({
      data: {
        totalAudits: total,
        completed,
        inProgress,
        draft,
        observations: { total: obsTotal, open: obsOpen, verified: obsVerified },
      },
    });
  } catch (error) {
    console.error('auditorDashboard error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.branchManagerDashboard = async (req, res) => {
  try {
    // Honours the role's data-scope rule, so a Planner/Compliance role with
    // zone or branch access sees a meaningful dashboard too.
    const instanceFilter = instanceScopeFilter(await resolveVisibleEntities(req.dataScope, req.user));
    const scoped = await AuditInstance.find(instanceFilter);
    const scopeIds = scoped.map((i) => i._id);

    // A specific branch manager can still be inspected explicitly.
    let bmInstances = [];
    if (req.query.branchManagerId) {
      const bm = await User.findById(req.query.branchManagerId);
      const entityId = bm ? bm.branch : null;
      const query = entityId
        ? { $or: [{ entityId, entityType: 'Branch' }, { startedBy: req.query.branchManagerId }] }
        : { startedBy: req.query.branchManagerId };
      bmInstances = await AuditInstance.find(query);
    }

    const instances = req.query.branchManagerId ? bmInstances : scoped;
    const instanceIds = instances.map((i) => i._id);
    const obsFilter = req.dataScope && req.dataScope.scopeType !== 'All'
      ? { auditInstance: { $in: scopeIds } }
      : {};

    const total = instances.length;
    const closed = instances.filter((i) => i.status === 'Closed').length;
    const pending = total - closed;

    const observations = await Observation.find({
      ...obsFilter,
      ...(req.query.branchManagerId ? { auditInstance: { $in: instanceIds } } : {}),
    });
    const obsOpen = observations.filter((o) => ['Open', 'PartiallyComplied'].includes(o.status)).length;

    res.json({
      data: {
        totalAudits: total,
        closed,
        pending,
        openObservations: obsOpen,
        complianceRate: total > 0 ? Math.round((closed / total) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('branchManagerDashboard error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

function groupBy(arr, fn) {
  const result = {};
  for (const item of arr) {
    const key = fn(item);
    if (!result[key]) result[key] = { count: 0, items: [] };
    result[key].count++;
  }
  return result;
}
