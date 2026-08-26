const Observation = require('../models/Observation');
const ComplianceAction = require('../models/ComplianceAction');
const AuditInstance = require('../models/AuditInstance');

exports.listObservations = async (req, res) => {
  try {
    const { entityType, entityId, status, assignedTo, severity, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (severity) query.severity = severity;

    if (entityType || entityId) {
      const auditQuery = {};
      if (entityType) auditQuery.entityType = entityType;
      if (entityId) auditQuery.entityId = entityId;
      const instances = await AuditInstance.find(auditQuery).select('_id');
      query.auditInstance = { $in: instances.map((i) => i._id) };
    }

    if (assignedTo) {
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

exports.submitComplianceAction = async (req, res) => {
  try {
    const observation = await Observation.findById(req.params.id);
    if (!observation) return res.status(404).json({ error: 'Observation not found.' });

    const { actionType, description, evidenceAttachments } = req.body;

    const action = await ComplianceAction.create({
      observation: observation._id,
      actionType: actionType || 'Response',
      description,
      submittedBy: req.user._id,
      submittedAt: new Date(),
      statusBefore: observation.status,
      evidenceAttachments,
    });

    if (actionType === 'Response') {
      observation.status = 'PartiallyComplied';
    }
    await observation.save();

    res.status(201).json({ data: action });
  } catch (error) {
    console.error('submitComplianceAction error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.verifyCompliance = async (req, res) => {
  try {
    const observation = await Observation.findById(req.params.id);
    if (!observation) return res.status(404).json({ error: 'Observation not found.' });

    const { description, evidenceAttachments } = req.body;

    const action = await ComplianceAction.create({
      observation: observation._id,
      actionType: 'Verification',
      description: description || 'Verified compliance action',
      submittedBy: req.user._id,
      submittedAt: new Date(),
      statusBefore: observation.status,
      statusAfter: 'Verified',
      evidenceAttachments,
    });

    observation.status = 'Verified';
    await observation.save();

    res.status(201).json({ data: action });
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
