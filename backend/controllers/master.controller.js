const Branch = require('../models/Branch');
const PACS = require('../models/PACS');
const FinancialYear = require('../models/FinancialYear');
const AuditType = require('../models/AuditType');

exports.listBranches = async (req, res) => {
  try {
    const { search, status, zone } = req.query;
    const query = {};
    if (status) query.status = status;
    if (zone) query.zone = zone;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }
    const branches = await Branch.find(query).sort({ code: 1 });
    res.json({ data: branches });
  } catch (error) {
    console.error('listBranches error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createBranch = async (req, res) => {
  try {
    const { code, name, zone, region, address, controllingOfficeId, category } = req.body;
    if (!code || !name) return res.status(400).json({ error: 'code and name are required.' });
    const existing = await Branch.findOne({ code });
    if (existing) return res.status(409).json({ error: 'Branch code already exists.' });
    const branch = await Branch.create({ code, name, zone, region, address, controllingOfficeId, category });
    res.status(201).json({ data: branch });
  } catch (error) {
    console.error('createBranch error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id).populate('controllingOfficeId');
    if (!branch) return res.status(404).json({ error: 'Branch not found.' });
    res.json({ data: branch });
  } catch (error) {
    console.error('getBranch error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateBranch = async (req, res) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!branch) return res.status(404).json({ error: 'Branch not found.' });
    res.json({ data: branch });
  } catch (error) {
    console.error('updateBranch error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, { status: 'closed' }, { new: true });
    if (!branch) return res.status(404).json({ error: 'Branch not found.' });
    res.json({ message: 'Branch closed successfully.' });
  } catch (error) {
    console.error('deleteBranch error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.listPacs = async (req, res) => {
  try {
    const { search, category, linkedBranch } = req.query;
    const query = {};
    if (category) query.category = category;
    if (linkedBranch) query.linkedBranch = linkedBranch;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { registrationNumber: { $regex: search, $options: 'i' } },
      ];
    }
    const pacs = await PACS.find(query).populate('linkedBranch', 'name code').sort({ name: 1 });
    res.json({ data: pacs });
  } catch (error) {
    console.error('listPacs error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createPacs = async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: 'PACS name is required.' });
    const pacs = await PACS.create(req.body);
    res.status(201).json({ data: pacs });
  } catch (error) {
    console.error('createPacs error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getPacs = async (req, res) => {
  try {
    const pacs = await PACS.findById(req.params.id).populate('linkedBranch', 'name code');
    if (!pacs) return res.status(404).json({ error: 'PACS not found.' });
    res.json({ data: pacs });
  } catch (error) {
    console.error('getPacs error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updatePacs = async (req, res) => {
  try {
    const pacs = await PACS.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!pacs) return res.status(404).json({ error: 'PACS not found.' });
    res.json({ data: pacs });
  } catch (error) {
    console.error('updatePacs error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deletePacs = async (req, res) => {
  try {
    const pacs = await PACS.findByIdAndDelete(req.params.id);
    if (!pacs) return res.status(404).json({ error: 'PACS not found.' });
    res.json({ message: 'PACS deleted successfully.' });
  } catch (error) {
    console.error('deletePacs error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.bulkImportPacs = async (req, res) => {
  try {
    const { pacsList } = req.body;
    if (!pacsList || !Array.isArray(pacsList) || pacsList.length === 0) {
      return res.status(400).json({ error: 'pacsList must be a non-empty array of PACS objects.' });
    }
    const created = await PACS.insertMany(pacsList);
    res.status(201).json({ data: created, count: created.length });
  } catch (error) {
    console.error('bulkImportPacs error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.listFinancialYears = async (req, res) => {
  try {
    const fys = await FinancialYear.find().sort({ startDate: -1 });
    res.json({ data: fys });
  } catch (error) {
    console.error('listFinancialYears error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createFinancialYear = async (req, res) => {
  try {
    const { code, startDate, endDate, isOpen } = req.body;
    if (!code || !startDate || !endDate) return res.status(400).json({ error: 'code, startDate, and endDate are required.' });
    const existing = await FinancialYear.findOne({ code });
    if (existing) return res.status(409).json({ error: 'FinancialYear code already exists.' });
    const fy = await FinancialYear.create({ code, startDate, endDate, isOpen });
    res.status(201).json({ data: fy });
  } catch (error) {
    console.error('createFinancialYear error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getFinancialYear = async (req, res) => {
  try {
    const fy = await FinancialYear.findById(req.params.id);
    if (!fy) return res.status(404).json({ error: 'FinancialYear not found.' });
    res.json({ data: fy });
  } catch (error) {
    console.error('getFinancialYear error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateFinancialYear = async (req, res) => {
  try {
    const fy = await FinancialYear.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!fy) return res.status(404).json({ error: 'FinancialYear not found.' });
    res.json({ data: fy });
  } catch (error) {
    console.error('updateFinancialYear error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteFinancialYear = async (req, res) => {
  try {
    const fy = await FinancialYear.findByIdAndDelete(req.params.id);
    if (!fy) return res.status(404).json({ error: 'FinancialYear not found.' });
    res.json({ message: 'FinancialYear deleted successfully.' });
  } catch (error) {
    console.error('deleteFinancialYear error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.listAuditTypes = async (req, res) => {
  try {
    const types = await AuditType.find().populate('currentTemplateId').populate('workflowDefId');
    res.json({ data: types });
  } catch (error) {
    console.error('listAuditTypes error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createAuditType = async (req, res) => {
  try {
    const { code, name, defaultFrequency, currentTemplateId, workflowDefId } = req.body;
    if (!code || !name) return res.status(400).json({ error: 'code and name are required.' });
    const existing = await AuditType.findOne({ code });
    if (existing) return res.status(409).json({ error: 'AuditType code already exists.' });
    const type = await AuditType.create({ code, name, defaultFrequency, currentTemplateId, workflowDefId });
    res.status(201).json({ data: type });
  } catch (error) {
    console.error('createAuditType error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getAuditType = async (req, res) => {
  try {
    const type = await AuditType.findById(req.params.id).populate('currentTemplateId').populate('workflowDefId');
    if (!type) return res.status(404).json({ error: 'AuditType not found.' });
    res.json({ data: type });
  } catch (error) {
    console.error('getAuditType error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateAuditType = async (req, res) => {
  try {
    const type = await AuditType.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!type) return res.status(404).json({ error: 'AuditType not found.' });
    res.json({ data: type });
  } catch (error) {
    console.error('updateAuditType error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteAuditType = async (req, res) => {
  try {
    const type = await AuditType.findByIdAndDelete(req.params.id);
    if (!type) return res.status(404).json({ error: 'AuditType not found.' });
    res.json({ message: 'AuditType deleted successfully.' });
  } catch (error) {
    console.error('deleteAuditType error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
