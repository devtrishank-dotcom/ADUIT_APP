const ClosureCertificate = require('../models/ClosureCertificate');
const AuditInstance = require('../models/AuditInstance');
const Observation = require('../models/Observation');
const ActivityLog = require('../models/ActivityLog');

exports.generateClosure = async (req, res) => {
  try {
    const instance = await AuditInstance.findById(req.params.id);
    if (!instance) return res.status(404).json({ error: 'AuditInstance not found.' });

    if (instance.status !== 'Approved') {
      return res.status(400).json({ error: 'Audit must be in Approved status to generate closure certificate.' });
    }

    const observations = await Observation.find({ auditInstance: instance._id });
    const unresolved = observations.filter((o) => !['Verified', 'AcceptedRisk'].includes(o.status));
    if (unresolved.length > 0) {
      return res.status(400).json({
        error: `${unresolved.length} observation(s) still unresolved. All observations must be verified or accepted.`,
      });
    }

    const year = new Date().getFullYear();
    const count = await ClosureCertificate.countDocuments({
      certificateNumber: { $regex: `^CLS-${year}-` },
    });
    const certificateNumber = `CLS-${year}-${String(count + 1).padStart(3, '0')}`;

    const cert = await ClosureCertificate.create({
      auditInstance: instance._id,
      certificateNumber,
      generatedAt: new Date(),
      signedBy_hia: req.user._id,
      remarks: req.body.remarks || '',
    });

    instance.status = 'Closed';
    instance.closureCertificate = cert._id;
    instance.completedAt = new Date();
    await instance.save();

    await ActivityLog.create({
      actorUser: req.user._id,
      entityType: 'AuditInstance',
      entityId: instance._id,
      action: 'Closed',
      afterJson: { status: 'Closed', certificateNumber },
      ipAddress: req.ip,
    });

    res.status(201).json({ data: cert });
  } catch (error) {
    console.error('generateClosure error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getClosureCertificate = async (req, res) => {
  try {
    const cert = await ClosureCertificate.findOne({ auditInstance: req.params.id })
      .populate('auditInstance')
      .populate('signedBy_hia', 'name employeeCode')
      .populate('signedBy_auditor', 'name employeeCode');

    if (!cert) return res.status(404).json({ error: 'Closure certificate not found.' });

    res.json({ data: cert });
  } catch (error) {
    console.error('getClosureCertificate error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.reopen = async (req, res) => {
  try {
    const instance = await AuditInstance.findById(req.params.id);
    if (!instance) return res.status(404).json({ error: 'AuditInstance not found.' });

    if (instance.status !== 'Closed') {
      return res.status(400).json({ error: 'Audit must be Closed to reopen.' });
    }

    instance.status = 'Approved';
    instance.closureCertificate = null;
    await instance.save();

    await ActivityLog.create({
      actorUser: req.user._id,
      entityType: 'AuditInstance',
      entityId: instance._id,
      action: 'Reopened',
      afterJson: { status: 'Approved', reason: req.body.reason || '' },
      ipAddress: req.ip,
    });

    res.json({ data: instance });
  } catch (error) {
    console.error('reopen error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getReadyForClosure = async (req, res) => {
  try {
    const approvedInstances = await AuditInstance.find({ status: 'Approved' })
      .populate('auditType', 'name code')
      .populate('startedBy', 'name employeeCode');

    const ready = [];

    for (const instance of approvedInstances) {
      const observations = await Observation.find({ auditInstance: instance._id });
      const allResolved = observations.every((o) => ['Verified', 'AcceptedRisk'].includes(o.status));
      if (allResolved && observations.length > 0) {
        ready.push(instance);
      }
    }

    res.json({ data: ready, count: ready.length });
  } catch (error) {
    console.error('getReadyForClosure error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
