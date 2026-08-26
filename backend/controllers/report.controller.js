const AuditPlanItem = require('../models/AuditPlanItem');
const AuditInstance = require('../models/AuditInstance');
const Observation = require('../models/Observation');
const AuditPlan = require('../models/AuditPlan');
const Template = require('../models/Template');
const Branch = require('../models/Branch');
const PACS = require('../models/PACS');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

exports.planVsActual = async (req, res) => {
  try {
    const { financialYear } = req.query;
    let planQuery = {};
    if (financialYear) planQuery.financialYear = financialYear;

    const plans = await AuditPlan.find(planQuery);
    const planIds = plans.map((p) => p._id);

    const items = await AuditPlanItem.find({ plan: { $in: planIds } })
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

    if (entityType) {
      const instances = await AuditInstance.find({ entityType }).select('_id');
      query.auditInstance = { $in: instances.map((i) => i._id) };
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
    const matchStage = {};
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
    const observations = await Observation.find({
      status: { $in: ['Open', 'PartiallyComplied'] },
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
    const totalAudits = await AuditInstance.countDocuments();
    const completed = await AuditInstance.countDocuments({ status: 'Closed' });
    const pending = await AuditInstance.countDocuments({ status: { $nin: ['Closed', 'Draft'] } });
    const overdueObservations = await Observation.countDocuments({
      status: { $in: ['Open', 'PartiallyComplied'] },
      targetDate: { $lt: new Date() },
    });

    const riskDist = await AuditInstance.aggregate([
      { $match: { overallRiskBand: { $exists: true, $ne: null } } },
      { $group: { _id: '$overallRiskBand', count: { $sum: 1 } } },
    ]);

    const [totalTemplates, totalBranches, totalPacs, totalUsers, recentActivity] = await Promise.all([
      Template.countDocuments({ status: { $ne: 'Archived' } }),
      Branch.countDocuments({ status: 'active' }),
      PACS.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'active' }),
      ActivityLog.find().sort({ createdAt: -1 }).limit(8).populate('actorUser', 'name employeeCode'),
    ]);

    const completedInstances = await AuditInstance.find({ status: 'Closed', completedAt: { $exists: true } }).select('createdAt completedAt');
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
    const bmId = req.query.branchManagerId || req.user._id;
    const User = require('../models/User');
    const bm = await User.findById(bmId);
    const entityId = bm ? bm.branch : null;

    const query = {};
    if (entityId) {
      query.$or = [
        { entityId, entityType: 'Branch' },
        { startedBy: bmId },
      ];
    } else {
      query.startedBy = bmId;
    }

    const instances = await AuditInstance.find(query);
    const instanceIds = instances.map((i) => i._id);

    const total = instances.length;
    const closed = instances.filter((i) => i.status === 'Closed').length;
    const pending = total - closed;

    const observations = await Observation.find({ auditInstance: { $in: instanceIds } });
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
