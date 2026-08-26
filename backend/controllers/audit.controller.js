const multer = require('multer');
const path = require('path');
const pathModule = require('path');
const AuditInstance = require('../models/AuditInstance');
const AuditResponse = require('../models/AuditResponse');
const AuditPlanItem = require('../models/AuditPlanItem');
const AuditType = require('../models/AuditType');
const Template = require('../models/Template');
const Observation = require('../models/Observation');
const WorkflowInstance = require('../models/WorkflowInstance');
const WorkflowTransitionLog = require('../models/WorkflowTransitionLog');
const WorkflowDefinition = require('../models/WorkflowDefinition');
const RiskConfig = require('../models/RiskConfig');
const Attachment = require('../models/Attachment');
const { applyDataScope } = require('../middleware/rbac');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${pathModule.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

exports.upload = upload;

exports.createInstance = async (req, res) => {
  try {
    const { planItem, auditType, entityType, entityId, periodFrom, periodTo } = req.body;
    if (!auditType || !entityType || !entityId) {
      return res.status(400).json({ error: 'auditType, entityType, and entityId are required.' });
    }

    const template = await Template.findOne({ auditType, status: 'Published' }).sort({ version: -1 });
    const workflowDef = await WorkflowDefinition.findOne({ auditType, status: 'Published' }).sort({ version: -1 });

    const instance = await AuditInstance.create({
      planItem: planItem || null,
      auditType,
      template: template ? template._id : undefined,
      workflowDef: workflowDef ? workflowDef._id : undefined,
      entityType,
      entityId,
      periodFrom,
      periodTo,
      startedBy: req.user._id,
      startedAt: new Date(),
      status: 'InProgress',
    });

    res.status(201).json({ data: instance });
  } catch (error) {
    console.error('createInstance error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.listInstances = async (req, res) => {
  try {
    const { status, entityType, auditType, page = 1, limit = 20 } = req.query;
    let query = AuditInstance.find();

    if (status) query = query.where('status').equals(status);
    if (entityType) query = query.where('entityType').equals(entityType);
    if (auditType) query = query.where('auditType').equals(auditType);

    if (req.dataScope) {
      query = applyDataScope(query, req.dataScope);
    }

    const total = await AuditInstance.countDocuments(query.getFilter());
    const instances = await query
      .populate('auditType', 'name code')
      .populate('template', 'version')
      .populate('startedBy', 'name employeeCode')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ data: instances, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    console.error('listInstances error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getInstance = async (req, res) => {
  try {
    const instance = await AuditInstance.findById(req.params.id)
      .populate('auditType')
      .populate('template')
      .populate('workflowDef')
      .populate('startedBy', 'name employeeCode')
      .populate('planItem');

    if (!instance) return res.status(404).json({ error: 'AuditInstance not found.' });

    const responses = await AuditResponse.find({ auditInstance: instance._id });
    const observations = await Observation.find({ auditInstance: instance._id });

    res.json({ data: { ...instance.toObject(), responses, observations } });
  } catch (error) {
    console.error('getInstance error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getForm = async (req, res) => {
  try {
    const instance = await AuditInstance.findById(req.params.id).populate('template');
    if (!instance) return res.status(404).json({ error: 'AuditInstance not found.' });

    const template = instance.template;
    const responses = await AuditResponse.find({ auditInstance: instance._id });

    res.json({
      data: {
        instance: { _id: instance._id, status: instance.status, entityType: instance.entityType, entityId: instance.entityId },
        template: template ? { _id: template._id, version: template.version, sections: template.sections } : null,
        responses,
      },
    });
  } catch (error) {
    console.error('getForm error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.saveResponses = async (req, res) => {
  try {
    const { responses } = req.body;
    if (!responses || !Array.isArray(responses)) {
      return res.status(400).json({ error: 'responses array is required.' });
    }

    const bulkOps = responses.map((r) => ({
      updateOne: {
        filter: {
          auditInstance: req.params.id,
          sectionCode: r.sectionCode,
          fieldCode: r.fieldCode,
          gridRowIndex: r.gridRowIndex || -1,
          columnCode: r.columnCode || null,
        },
        update: {
          $set: {
            value: r.value,
            riskPointsApplied: r.riskPointsApplied,
            severity: r.severity,
            remarks: r.remarks,
            updatedBy: req.user._id,
          },
        },
        upsert: true,
      },
    }));

    await AuditResponse.bulkWrite(bulkOps);

    res.json({ message: 'Responses saved successfully.', count: responses.length });
  } catch (error) {
    console.error('saveResponses error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.uploadAttachments = async (req, res) => {
  upload.array('files', 10)(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      const { fieldCode } = req.body;
      const attachments = [];
      for (const file of req.files) {
        const att = await Attachment.create({
          auditInstance: req.params.id,
          fieldCode,
          fileName: file.originalname,
          filePath: file.path,
          fileType: file.mimetype,
          fileSize: file.size,
          uploadedBy: req.user._id,
        });
        attachments.push(att);
      }
      res.status(201).json({ data: attachments });
    } catch (error) {
      console.error('uploadAttachments error:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  });
};

exports.createObservation = async (req, res) => {
  try {
    const { fieldCode, sectionCode, title, description, severity, targetDate, recurrenceOf } = req.body;
    if (!title) return res.status(400).json({ error: 'Observation title is required.' });

    const instance = await AuditInstance.findById(req.params.id);
    if (!instance) return res.status(404).json({ error: 'AuditInstance not found.' });

    const obs = await Observation.create({
      auditInstance: req.params.id,
      fieldCode,
      sectionCode,
      title,
      description,
      severity: severity || 'Medium',
      targetDate,
      recurrenceOf,
      status: 'Open',
    });

    res.status(201).json({ data: obs });
  } catch (error) {
    console.error('createObservation error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.submit = async (req, res) => {
  try {
    const instance = await AuditInstance.findById(req.params.id);
    if (!instance) return res.status(404).json({ error: 'AuditInstance not found.' });
    if (!['Draft', 'InProgress'].includes(instance.status)) {
      return res.status(400).json({ error: 'Cannot submit audit in current status.' });
    }

    instance.status = 'Submitted';
    instance.submittedAt = new Date();
    await instance.save();

    if (instance.workflowDef) {
      const wfDef = await WorkflowDefinition.findById(instance.workflowDef);
      if (wfDef && wfDef.stages && wfDef.stages.length > 0) {
        const wfInstance = await WorkflowInstance.create({
          subjectType: 'AuditInstance',
          subjectId: instance._id,
          workflowDef: instance.workflowDef,
          currentStageIndex: 0,
          status: 'Active',
        });
        instance.workflowInstance = wfInstance._id;
        await instance.save();
      }
    }

    res.json({ data: instance });
  } catch (error) {
    console.error('submit error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.workflowAction = async (req, res) => {
  try {
    const { action, comment } = req.body;
    if (!action) return res.status(400).json({ error: 'action is required.' });

    const instance = await AuditInstance.findById(req.params.id).populate('workflowDef');
    if (!instance) return res.status(404).json({ error: 'AuditInstance not found.' });

    const wfInstance = await WorkflowInstance.findOne({ subjectId: instance._id, status: 'Active' });
    if (!wfInstance) return res.status(400).json({ error: 'No active workflow for this audit.' });

    const wfDef = instance.workflowDef || await WorkflowDefinition.findById(wfInstance.workflowDef);
    if (!wfDef) return res.status(400).json({ error: 'Workflow definition not found.' });

    const currentStage = wfDef.stages[wfInstance.currentStageIndex];
    if (!currentStage) return res.status(400).json({ error: 'Invalid workflow stage.' });

    const fromStageIndex = wfInstance.currentStageIndex;
    let toStageIndex = fromStageIndex;

    switch (action) {
      case 'approve':
        if (wfInstance.currentStageIndex < wfDef.stages.length - 1) {
          toStageIndex = wfInstance.currentStageIndex + 1;
          wfInstance.currentStageIndex = toStageIndex;
        } else {
          wfInstance.status = 'Completed';
          instance.status = 'Approved';
          await instance.save();
        }
        break;
      case 'return':
        toStageIndex = Math.max(0, wfInstance.currentStageIndex - 1);
        wfInstance.currentStageIndex = toStageIndex;
        instance.status = 'ReturnedForRework';
        await instance.save();
        break;
      case 'escalate':
        wfInstance.status = 'Escalated';
        break;
      default:
        return res.status(400).json({ error: 'Invalid action. Use approve, return, or escalate.' });
    }

    await wfInstance.save();

    await WorkflowTransitionLog.create({
      workflowInstance: wfInstance._id,
      fromStageIndex,
      toStageIndex: wfInstance.status === 'Completed' ? fromStageIndex : toStageIndex,
      action,
      actorUser: req.user._id,
      comment,
    });

    res.json({ data: { instance, wfInstance } });
  } catch (error) {
    console.error('workflowAction error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getRiskScore = async (req, res) => {
  try {
    const instance = await AuditInstance.findById(req.params.id).populate('template');
    if (!instance) return res.status(404).json({ error: 'AuditInstance not found.' });

    const responses = await AuditResponse.find({ auditInstance: instance._id });
    const riskConfigs = await RiskConfig.find({ auditType: instance.auditType });

    const sectionScores = [];
    let overallScore = 0;

    if (instance.template && instance.template.sections) {
      for (const section of instance.template.sections) {
        let sectionScore = 0;
        for (const field of section.fields) {
          const response = responses.find(
            (r) => r.sectionCode === section.code && r.fieldCode === field.code
          );
          if (response && response.riskPointsApplied) {
            sectionScore += response.riskPointsApplied;
          }
        }
        sectionScores.push({ section: section.code, score: sectionScore, band: '' });
        overallScore += sectionScore;
      }
    }

    let band = 'Low';
    for (const config of riskConfigs) {
      if (config.bandDefinitions) {
        for (const bd of config.bandDefinitions) {
          if (overallScore >= bd.minScore && overallScore <= bd.maxScore) {
            band = bd.bandName;
            break;
          }
        }
      }
    }

    sectionScores.forEach((ss) => {
      ss.band = band;
    });

    instance.overallRiskScore = overallScore;
    instance.overallRiskBand = band;
    await instance.save();

    res.json({ data: { overallScore, band, sectionScores } });
  } catch (error) {
    console.error('getRiskScore error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteInstance = async (req, res) => {
  try {
    const instance = await AuditInstance.findById(req.params.id);
    if (!instance) return res.status(404).json({ error: 'AuditInstance not found.' });
    if (!['Draft', 'InProgress'].includes(instance.status)) {
      return res.status(400).json({ error: 'Only draft or in-progress audits can be deleted.' });
    }
    await AuditResponse.deleteMany({ auditInstance: instance._id });
    await Observation.deleteMany({ auditInstance: instance._id });
    await AuditInstance.findByIdAndDelete(req.params.id);
    res.json({ message: 'Audit instance deleted successfully.' });
  } catch (error) {
    console.error('deleteInstance error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.exportPdf = async (req, res) => {
  try {
    const instance = await AuditInstance.findById(req.params.id)
      .populate('auditType')
      .populate('template')
      .populate('startedBy', 'name employeeCode');

    if (!instance) return res.status(404).json({ error: 'AuditInstance not found.' });

    const responses = await AuditResponse.find({ auditInstance: instance._id });
    const observations = await Observation.find({ auditInstance: instance._id });

    res.json({
      data: {
        audit: instance,
        responses,
        observations,
        generatedAt: new Date(),
        _note: 'PDF generation placeholder - use client-side PDF library to render.',
      },
    });
  } catch (error) {
    console.error('exportPdf error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
