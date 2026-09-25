const Observation = require('../models/Observation');
const ComplianceAction = require('../models/ComplianceAction');
const AuditInstance = require('../models/AuditInstance');

exports.listObservations = async (req, res) => {
  try {
    const { auditInstanceId, entityType, entityId, status, assignedTo, severity, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (severity) query.severity = severity;

    if (auditInstanceId) {
      query.auditInstance = auditInstanceId;
    } else if (entityType || entityId) {
      const auditQuery = {};
      if (entityType) auditQuery.entityType = entityType;
      if (entityId) auditQuery.entityId = entityId;
      const instances = await AuditInstance.find(auditQuery).select('_id');
      query.auditInstance = { $in: instances.map((i) => i._id) };
    } else if (assignedTo) {
      const instances = await AuditInstance.find({ startedBy: assignedTo }).select('_id');
      query.auditInstance = { $in: instances.map((i) => i._id) };
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
    console.error('listObservations error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getObservationDetail = async (req, res) => {
  try {
    const observation = await Observation.findById(req.params.id)
      .populate({
        path: 'auditInstance',
        populate: { path: 'auditType', select: 'name code' },
      })
      .populate('recurrenceOf');

    if (!observation) return res.status(404).json({ error: 'Observation not found.' });

    const actions = await ComplianceAction.find({ observation: observation._id })
      .populate('submittedBy', 'name employeeCode')
      .sort({ createdAt: -1 });

    res.json({ data: { ...observation.toObject(), complianceActions: actions } });
  } catch (error) {
    console.error('getObservationDetail error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const normalizeAttachments = (body) => {
  const raw = body.evidenceAttachments || body.attachments || [];
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(Boolean)
    .map((a) => (typeof a === 'string' ? { filePath: a } : a));
};

exports.submitComplianceAction = async (req, res) => {
  try {
    const observation = await Observation.findById(req.params.id);
    if (!observation) return res.status(404).json({ error: 'Observation not found.' });

    if (!['Open', 'PartiallyComplied'].includes(observation.status)) {
      return res.status(400).json({ error: 'This observation is not open for a compliance response.' });
    }

    const { actionType = 'Response', description } = req.body;
    if (!description) return res.status(400).json({ error: 'Rectification description is required.' });

    const outcome = req.body.outcome === 'Complied' ? 'Complied' : 'PartiallyComplied';

    const action = await ComplianceAction.create({
      observation: observation._id,
      actionType: actionType || 'Response',
      description,
      submittedBy: req.user._id,
      submittedAt: new Date(),
      statusBefore: observation.status,
      statusAfter: outcome,
      evidenceAttachments: normalizeAttachments(req.body),
    });

    observation.status = outcome;
    await observation.save();

    res.status(201).json({ data: { action, observation } });
  } catch (error) {
    console.error('submitComplianceAction error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.verifyCompliance = async (req, res) => {
  try {
    const observation = await Observation.findById(req.params.id);
    if (!observation) return res.status(404).json({ error: 'Observation not found.' });

    const actionType = req.body.actionType || 'Verification';
    const description = req.body.description;
    if (!['Verification', 'Rejection', 'AcceptRisk'].includes(actionType)) {
      return res.status(400).json({ error: 'Invalid action. Use Verification, Rejection or AcceptRisk.' });
    }

    let statusAfter;
    if (actionType === 'Verification') statusAfter = 'Verified';
    else if (actionType === 'Rejection') statusAfter = 'Open';
    else statusAfter = 'AcceptedRisk';

    const action = await ComplianceAction.create({
      observation: observation._id,
      actionType,
      description: description
        || (actionType === 'Rejection'
          ? 'Compliance response rejected — rectification required.'
          : actionType === 'AcceptRisk'
            ? 'Risk consciously accepted by competent authority.'
            : 'Verified compliance action'),
      submittedBy: req.user._id,
      submittedAt: new Date(),
      statusBefore: observation.status,
      statusAfter,
      evidenceAttachments: normalizeAttachments(req.body),
    });

    observation.status = statusAfter;
    await observation.save();

    res.status(201).json({ data: { action, observation } });
  } catch (error) {
    console.error('verifyCompliance error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getAgeing = async (req, res) => {
  try {
    const now = new Date();
    const observations = await Observation.find({ status: { $in: ['Open', 'PartiallyComplied'] } });

    const buckets = { '0-7': 0, '8-15': 0, '16-30': 0, '30+': 0 };

    for (const obs of observations) {
      const days = Math.floor((now - obs.createdAt) / (1000 * 60 * 60 * 24));
      if (days <= 7) buckets['0-7']++;
      else if (days <= 15) buckets['8-15']++;
      else if (days <= 30) buckets['16-30']++;
      else buckets['30+']++;
    }

    res.json({ data: { ageingBuckets: buckets, total: observations.length } });
  } catch (error) {
    console.error('getAgeing error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
