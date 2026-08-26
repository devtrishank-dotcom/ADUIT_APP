const mongoose = require('mongoose');
const Template = require('../models/Template');
const OptionList = require('../models/OptionList');
const ValueStatement = require('../models/ValueStatement');
const RiskConfig = require('../models/RiskConfig');

const invalidId = (value) => !mongoose.isValidObjectId(value);

exports.list = async (req, res) => {
  try {
    const { auditType, status } = req.query;
    const query = {};
    if (auditType) query.auditType = auditType;
    if (status) query.status = status;
    const templates = await Template.find(query).populate('auditType').sort({ version: -1 });
    res.json({ data: templates });
  } catch (error) {
    console.error('list templates error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { auditType, sections } = req.body;
    if (!auditType) return res.status(400).json({ error: 'auditType is required.' });
    const lastTemplate = await Template.findOne({ auditType }).sort({ version: -1 });
    const version = lastTemplate ? lastTemplate.version + 1 : 1;
    const template = await Template.create({
      auditType,
      version,
      status: 'Draft',
      createdBy: req.user._id,
      sections: sections || [],
    });
    res.status(201).json({ data: template });
  } catch (error) {
    console.error('create template error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.get = async (req, res) => {
  try {
    if (invalidId(req.params.id)) return res.status(400).json({ error: 'Invalid template id.' });
    const template = await Template.findById(req.params.id).populate('auditType');
    if (!template) return res.status(404).json({ error: 'Template not found.' });
    res.json({ data: template });
  } catch (error) {
    console.error('get template error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { sections, ...rest } = req.body;
    const updateFields = { ...rest };
    if (sections) updateFields.sections = sections;
    const template = await Template.findByIdAndUpdate(req.params.id, { $set: updateFields }, { new: true });
    if (!template) return res.status(404).json({ error: 'Template not found.' });
    res.json({ data: template });
  } catch (error) {
    console.error('update template error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.delete = async (req, res) => {
  try {
    const template = await Template.findByIdAndUpdate(req.params.id, { status: 'Archived' }, { new: true });
    if (!template) return res.status(404).json({ error: 'Template not found.' });
    res.json({ message: 'Template archived successfully.' });
  } catch (error) {
    console.error('delete template error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.publish = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found.' });
    template.status = 'Published';
    template.publishedAt = new Date();
    await template.save();
    res.json({ data: template });
  } catch (error) {
    console.error('publish error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.clone = async (req, res) => {
  try {
    const source = await Template.findById(req.params.id);
    if (!source) return res.status(404).json({ error: 'Template not found.' });
    const lastTemplate = await Template.findOne({ auditType: source.auditType }).sort({ version: -1 });
    const newVersion = lastTemplate ? lastTemplate.version + 1 : source.version + 1;
    const cloned = await Template.create({
      auditType: source.auditType,
      version: newVersion,
      status: 'Draft',
      createdBy: req.user._id,
      sections: JSON.parse(JSON.stringify(source.sections || [])),
    });
    res.status(201).json({ data: cloned });
  } catch (error) {
    console.error('clone error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.preview = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id).populate('auditType');
    if (!template) return res.status(404).json({ error: 'Template not found.' });
    res.json({
      data: {
        _id: template._id,
        auditType: template.auditType,
        version: template.version,
        status: template.status,
        sections: template.sections,
      },
    });
  } catch (error) {
    console.error('preview error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.listSections = async (req, res) => {
  try {
    if (invalidId(req.params.templateId)) return res.status(400).json({ error: 'Invalid template id.' });
    const template = await Template.findById(req.params.templateId);
    if (!template) return res.status(404).json({ error: 'Template not found.' });
    const sections = [...(template.sections || [])].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    res.json({ data: sections });
  } catch (error) {
    console.error('listSections error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.listFields = async (req, res) => {
  try {
    if (invalidId(req.params.templateId)) return res.status(400).json({ error: 'Invalid template id.' });
    const template = await Template.findById(req.params.templateId);
    if (!template) return res.status(404).json({ error: 'Template not found.' });
    const section = template.sections.find((item) => item.code === req.params.sectionCode);
    if (!section) return res.status(404).json({ error: 'Section not found.' });
    const fields = [...(section.fields || [])].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    res.json({ data: fields });
  } catch (error) {
    console.error('listFields error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createSection = async (req, res) => {
  try {
    if (invalidId(req.params.templateId)) return res.status(400).json({ error: 'Invalid template id.' });
    const template = await Template.findById(req.params.templateId);
    if (!template) return res.status(404).json({ error: 'Template not found.' });
    const { code, titleEn, titleGu, parentSectionCode, sequence, fields } = req.body;
    if (!code) return res.status(400).json({ error: 'section code is required.' });
    const existing = template.sections.find((s) => s.code === code);
    if (existing) return res.status(409).json({ error: 'Section with this code already exists.' });
    template.sections.push({ code, titleEn, titleGu, parentSectionCode, sequence, fields: fields || [] });
    await template.save();
    res.status(201).json({ data: template });
  } catch (error) {
    console.error('createSection error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateSection = async (req, res) => {
  try {
    const template = await Template.findById(req.params.templateId);
    if (!template) return res.status(404).json({ error: 'Template not found.' });
    const idx = template.sections.findIndex((s) => s.code === req.params.sectionCode);
    if (idx === -1) return res.status(404).json({ error: 'Section not found.' });
    Object.assign(template.sections[idx], req.body);
    await template.save();
    res.json({ data: template });
  } catch (error) {
    console.error('updateSection error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteSection = async (req, res) => {
  try {
    const template = await Template.findById(req.params.templateId);
    if (!template) return res.status(404).json({ error: 'Template not found.' });
    template.sections = template.sections.filter((s) => s.code !== req.params.sectionCode);
    await template.save();
    res.json({ data: template });
  } catch (error) {
    console.error('deleteSection error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createField = async (req, res) => {
  try {
    const template = await Template.findById(req.params.templateId);
    if (!template) return res.status(404).json({ error: 'Template not found.' });
    const section = template.sections.find((s) => s.code === req.params.sectionCode);
    if (!section) return res.status(404).json({ error: 'Section not found.' });
    if (!req.body.code) return res.status(400).json({ error: 'field code is required.' });
    section.fields.push(req.body);
    await template.save();
    res.status(201).json({ data: template });
  } catch (error) {
    console.error('createField error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateField = async (req, res) => {
  try {
    const template = await Template.findById(req.params.templateId);
    if (!template) return res.status(404).json({ error: 'Template not found.' });
    const section = template.sections.find((s) => s.code === req.params.sectionCode);
    if (!section) return res.status(404).json({ error: 'Section not found.' });
    const idx = section.fields.findIndex((f) => f.code === req.params.fieldCode);
    if (idx === -1) return res.status(404).json({ error: 'Field not found.' });
    Object.assign(section.fields[idx], req.body);
    await template.save();
    res.json({ data: template });
  } catch (error) {
    console.error('updateField error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteField = async (req, res) => {
  try {
    const template = await Template.findById(req.params.templateId);
    if (!template) return res.status(404).json({ error: 'Template not found.' });
    const section = template.sections.find((s) => s.code === req.params.sectionCode);
    if (!section) return res.status(404).json({ error: 'Section not found.' });
    section.fields = section.fields.filter((f) => f.code !== req.params.fieldCode);
    await template.save();
    res.json({ data: template });
  } catch (error) {
    console.error('deleteField error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.listOptionLists = async (req, res) => {
  try {
    const lists = await OptionList.find();
    res.json({ data: lists });
  } catch (error) {
    console.error('listOptionLists error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createOptionList = async (req, res) => {
  try {
    const { code, name, isShared, items } = req.body;
    if (!code || !name) return res.status(400).json({ error: 'code and name are required.' });
    const existing = await OptionList.findOne({ code });
    if (existing) return res.status(409).json({ error: 'OptionList code already exists.' });
    const list = await OptionList.create({ code, name, isShared, items: items || [] });
    res.status(201).json({ data: list });
  } catch (error) {
    console.error('createOptionList error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getOptionList = async (req, res) => {
  try {
    const list = await OptionList.findById(req.params.id);
    if (!list) return res.status(404).json({ error: 'OptionList not found.' });
    res.json({ data: list });
  } catch (error) {
    console.error('getOptionList error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.listOptionItems = async (req, res) => {
  try {
    const list = await OptionList.findById(req.params.id).select('items');
    if (!list) return res.status(404).json({ error: 'OptionList not found.' });
    res.json({ data: list.items || [] });
  } catch (error) {
    console.error('listOptionItems error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateOptionList = async (req, res) => {
  try {
    const list = await OptionList.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!list) return res.status(404).json({ error: 'OptionList not found.' });
    res.json({ data: list });
  } catch (error) {
    console.error('updateOptionList error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteOptionList = async (req, res) => {
  try {
    const list = await OptionList.findByIdAndDelete(req.params.id);
    if (!list) return res.status(404).json({ error: 'OptionList not found.' });
    res.json({ message: 'OptionList deleted successfully.' });
  } catch (error) {
    console.error('deleteOptionList error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.addOptionItem = async (req, res) => {
  try {
    const list = await OptionList.findById(req.params.id);
    if (!list) return res.status(404).json({ error: 'OptionList not found.' });
    list.items.push(req.body);
    await list.save();
    res.status(201).json({ data: list });
  } catch (error) {
    console.error('addOptionItem error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateOptionItem = async (req, res) => {
  try {
    const list = await OptionList.findById(req.params.id);
    if (!list) return res.status(404).json({ error: 'OptionList not found.' });
    const idx = Number(req.params.itemIndex);
    if (!list.items[idx]) return res.status(404).json({ error: 'Item not found.' });
    Object.assign(list.items[idx], req.body);
    await list.save();
    res.json({ data: list });
  } catch (error) {
    console.error('updateOptionItem error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteOptionItem = async (req, res) => {
  try {
    const list = await OptionList.findById(req.params.id);
    if (!list) return res.status(404).json({ error: 'OptionList not found.' });
    list.items.splice(Number(req.params.itemIndex), 1);
    await list.save();
    res.json({ data: list });
  } catch (error) {
    console.error('deleteOptionItem error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.listValueStatements = async (req, res) => {
  try {
    const { category } = req.query;
    const query = { isActive: true };
    if (category) query.category = category;
    const statements = await ValueStatement.find(query);
    res.json({ data: statements });
  } catch (error) {
    console.error('listValueStatements error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createValueStatement = async (req, res) => {
  try {
    const { code, textEn, textGu, category } = req.body;
    if (!code) return res.status(400).json({ error: 'code is required.' });
    const existing = await ValueStatement.findOne({ code });
    if (existing) return res.status(409).json({ error: 'ValueStatement code already exists.' });
    const vs = await ValueStatement.create({ code, textEn, textGu, category });
    res.status(201).json({ data: vs });
  } catch (error) {
    console.error('createValueStatement error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getValueStatement = async (req, res) => {
  try {
    const vs = await ValueStatement.findById(req.params.id);
    if (!vs) return res.status(404).json({ error: 'ValueStatement not found.' });
    res.json({ data: vs });
  } catch (error) {
    console.error('getValueStatement error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateValueStatement = async (req, res) => {
  try {
    const vs = await ValueStatement.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!vs) return res.status(404).json({ error: 'ValueStatement not found.' });
    res.json({ data: vs });
  } catch (error) {
    console.error('updateValueStatement error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteValueStatement = async (req, res) => {
  try {
    const vs = await ValueStatement.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!vs) return res.status(404).json({ error: 'ValueStatement not found.' });
    res.json({ message: 'ValueStatement deactivated successfully.' });
  } catch (error) {
    console.error('deleteValueStatement error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.listRiskConfigs = async (req, res) => {
  try {
    const query = {};
    const auditTypeId = req.query.auditTypeId || req.query.auditType;
    if (auditTypeId) query.auditType = auditTypeId;
    const configs = await RiskConfig.find(query).populate('auditType');
    res.json({ data: configs });
  } catch (error) {
    console.error('listRiskConfigs error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createRiskConfig = async (req, res) => {
  try {
    const config = await RiskConfig.create(req.body);
    res.status(201).json({ data: config });
  } catch (error) {
    console.error('createRiskConfig error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getRiskConfig = async (req, res) => {
  try {
    const config = await RiskConfig.findById(req.params.id).populate('auditType');
    if (!config) return res.status(404).json({ error: 'RiskConfig not found.' });
    res.json({ data: config });
  } catch (error) {
    console.error('getRiskConfig error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateRiskConfig = async (req, res) => {
  try {
    const config = await RiskConfig.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!config) return res.status(404).json({ error: 'RiskConfig not found.' });
    res.json({ data: config });
  } catch (error) {
    console.error('updateRiskConfig error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteRiskConfig = async (req, res) => {
  try {
    const config = await RiskConfig.findByIdAndDelete(req.params.id);
    if (!config) return res.status(404).json({ error: 'RiskConfig not found.' });
    res.json({ message: 'RiskConfig deleted successfully.' });
  } catch (error) {
    console.error('deleteRiskConfig error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
