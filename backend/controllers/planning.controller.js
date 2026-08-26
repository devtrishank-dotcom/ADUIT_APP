const AuditPlan = require('../models/AuditPlan');
const AuditPlanItem = require('../models/AuditPlanItem');
const Branch = require('../models/Branch');
const PACS = require('../models/PACS');
const AuditType = require('../models/AuditType');
const FinancialYear = require('../models/FinancialYear');

exports.listPlans = async (req, res) => {
  try {
    const { financialYear, status } = req.query;
    const query = {};
    if (financialYear) query.financialYear = financialYear;
    if (status) query.status = status;
    const plans = await AuditPlan.find(query)
      .populate('financialYear')
      .populate('createdBy', 'name employeeCode')
      .populate('approvedBy', 'name employeeCode')
      .sort({ createdAt: -1 });
    res.json({ data: plans });
  } catch (error) {
    console.error('listPlans error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createPlan = async (req, res) => {
  try {
    const { financialYear } = req.body;
    if (!financialYear) return res.status(400).json({ error: 'financialYear is required.' });
    const plan = await AuditPlan.create({ financialYear, createdBy: req.user._id });
    res.status(201).json({ data: plan });
  } catch (error) {
    console.error('createPlan error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getPlan = async (req, res) => {
  try {
    const plan = await AuditPlan.findById(req.params.id)
      .populate('financialYear')
      .populate('createdBy', 'name employeeCode')
      .populate('approvedBy', 'name employeeCode');
    if (!plan) return res.status(404).json({ error: 'AuditPlan not found.' });
    res.json({ data: plan });
  } catch (error) {
    console.error('getPlan error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const plan = await AuditPlan.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!plan) return res.status(404).json({ error: 'AuditPlan not found.' });
    res.json({ data: plan });
  } catch (error) {
    console.error('updatePlan error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const plan = await AuditPlan.findByIdAndUpdate(req.params.id, { status: 'Archived' }, { new: true });
    if (!plan) return res.status(404).json({ error: 'AuditPlan not found.' });
    res.json({ message: 'AuditPlan archived successfully.' });
  } catch (error) {
    console.error('deletePlan error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.submitPlan = async (req, res) => {
  try {
    const plan = await AuditPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'AuditPlan not found.' });
    if (plan.status !== 'Draft') return res.status(400).json({ error: 'Only Draft plans can be submitted.' });
    plan.status = 'Submitted';
    await plan.save();
    res.json({ data: plan });
  } catch (error) {
    console.error('submitPlan error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.approvePlan = async (req, res) => {
  try {
    const plan = await AuditPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'AuditPlan not found.' });
    if (plan.status !== 'Submitted') return res.status(400).json({ error: 'Only Submitted plans can be approved.' });
    plan.status = 'Approved';
    plan.approvedBy = req.user._id;
    plan.approvedAt = new Date();
    await plan.save();
    res.json({ data: plan });
  } catch (error) {
    console.error('approvePlan error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.autoGenerate = async (req, res) => {
  try {
    const plan = await AuditPlan.findById(req.params.id).populate('financialYear');
    if (!plan) return res.status(404).json({ error: 'AuditPlan not found.' });

    const fy = plan.financialYear;
    const branches = await Branch.find({ status: 'active' });
    const pacs = await PACS.find({ status: 'active' });
    const auditTypes = await AuditType.find();

    const items = [];

    for (const branch of branches) {
      const branchAuditType = auditTypes.find((at) => at.code === 'BRANCH_AUDIT');
      if (branchAuditType) {
        const freq = branchAuditType.defaultFrequency || 'Annual';
        items.push({
          plan: plan._id,
          auditType: branchAuditType._id,
          entityType: 'Branch',
          entityId: branch._id,
          periodFrom: fy.startDate,
          periodTo: fy.endDate,
          priority: 'High',
          status: 'Planned',
        });
      }
    }

    for (const p of pacs) {
      const pacsAuditType = auditTypes.find((at) => at.code === 'PACS_AUDIT');
      if (pacsAuditType) {
        items.push({
          plan: plan._id,
          auditType: pacsAuditType._id,
          entityType: 'PACS',
          entityId: p._id,
          periodFrom: fy.startDate,
          periodTo: fy.endDate,
          priority: 'Medium',
          status: 'Planned',
        });
      }
    }

    const created = await AuditPlanItem.insertMany(items);
    res.status(201).json({ data: created, count: created.length });
  } catch (error) {
    console.error('autoGenerate error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.listPlanItems = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { plan: req.params.planId };
    if (status) query.status = status;
    const items = await AuditPlanItem.find(query)
      .populate('auditType', 'name code')
      .populate('assignedTo', 'name employeeCode')
      .sort({ plannedStart: 1 });
    res.json({ data: items });
  } catch (error) {
    console.error('listPlanItems error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createPlanItem = async (req, res) => {
  try {
    const item = await AuditPlanItem.create({ ...req.body, plan: req.params.planId });
    res.status(201).json({ data: item });
  } catch (error) {
    console.error('createPlanItem error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getPlanItem = async (req, res) => {
  try {
    const item = await AuditPlanItem.findById(req.params.itemId)
      .populate('auditType', 'name code')
      .populate('assignedTo', 'name employeeCode');
    if (!item) return res.status(404).json({ error: 'AuditPlanItem not found.' });
    res.json({ data: item });
  } catch (error) {
    console.error('getPlanItem error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updatePlanItem = async (req, res) => {
  try {
    const item = await AuditPlanItem.findByIdAndUpdate(req.params.itemId, { $set: req.body }, { new: true });
    if (!item) return res.status(404).json({ error: 'AuditPlanItem not found.' });
    res.json({ data: item });
  } catch (error) {
    console.error('updatePlanItem error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deletePlanItem = async (req, res) => {
  try {
    const item = await AuditPlanItem.findByIdAndDelete(req.params.itemId);
    if (!item) return res.status(404).json({ error: 'AuditPlanItem not found.' });
    res.json({ message: 'AuditPlanItem deleted successfully.' });
  } catch (error) {
    console.error('deletePlanItem error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.bulkImportItems = async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items must be a non-empty array.' });
    }
    const planItems = items.map((item) => ({ ...item, plan: req.params.planId }));
    const created = await AuditPlanItem.insertMany(planItems);
    res.status(201).json({ data: created, count: created.length });
  } catch (error) {
    console.error('bulkImportItems error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getCalendar = async (req, res) => {
  try {
    const { start, end } = req.query;
    const query = {};
    if (start && end) {
      query.$or = [
        { plannedStart: { $gte: new Date(start), $lte: new Date(end) } },
        { plannedEnd: { $gte: new Date(start), $lte: new Date(end) } },
        { actualStart: { $gte: new Date(start), $lte: new Date(end) } },
      ];
    }
    const items = await AuditPlanItem.find(query)
      .populate('auditType', 'name code')
      .populate('assignedTo', 'name employeeCode')
      .populate({ path: 'plan', populate: { path: 'financialYear' } })
      .sort({ plannedStart: 1 });
    res.json({ data: items });
  } catch (error) {
    console.error('getCalendar error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
