const Role = require('../models/Role');
const Permission = require('../models/Permission');
const DataScopeRule = require('../models/DataScopeRule');

const normalizeAction = (action) => ({
  read: 'view',
  update: 'edit',
}[String(action || '').toLowerCase()] || String(action || '').toLowerCase());

const normalizePermissions = (permissions = []) => permissions
  .filter((permission) => permission && permission.module)
  .map((permission) => ({
    module: permission.module,
    actions: [...new Set((permission.actions || (permission.action ? [permission.action] : []))
      .map(normalizeAction)
      .filter(Boolean))],
    fieldRestrictions: permission.fieldRestrictions || [],
  }));

const rolePayload = (body) => {
  const payload = {};
  ['name', 'description', 'isSystemRole'].forEach((key) => {
    if (body[key] !== undefined) payload[key] = body[key];
  });

  if (body.permissions !== undefined) payload.permissions = normalizePermissions(body.permissions);

  if (body.dataScopeRuleId !== undefined) {
    payload.dataScopeRule = body.dataScopeRuleId || null;
  } else if (body.dataScopeRule !== undefined) {
    payload.dataScopeRule = body.dataScopeRule || null;
  }

  if (body.dashboardConfig !== undefined || body.dashboardWidgets !== undefined) {
    payload.dashboardConfig = {
      ...(body.dashboardConfig || {}),
      ...(body.dashboardWidgets !== undefined ? { widgets: body.dashboardWidgets || [] } : {}),
    };
  }

  return payload;
};

exports.listRoles = async (req, res) => {
  try {
    const roles = await Role.find().populate('dataScopeRule');
    res.json({ data: roles });
  } catch (error) {
    console.error('listRoles error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createRole = async (req, res) => {
  try {
    const payload = rolePayload(req.body);
    const { name } = payload;
    if (!name) return res.status(400).json({ error: 'Role name is required.' });
    const existing = await Role.findOne({ name });
    if (existing) return res.status(409).json({ error: 'Role with this name already exists.' });
    const role = await Role.create(payload);
    res.status(201).json({ data: role });
  } catch (error) {
    console.error('createRole error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id).populate('dataScopeRule');
    if (!role) return res.status(404).json({ error: 'Role not found.' });
    res.json({ data: role });
  } catch (error) {
    console.error('getRole error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateRole = async (req, res) => {
  try {
    if (!require('mongoose').isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid role id.' });
    }

    const payload = rolePayload(req.body);
    if (payload.name) {
      const duplicate = await Role.findOne({ name: payload.name, _id: { $ne: req.params.id } });
      if (duplicate) return res.status(409).json({ error: 'Role with this name already exists.' });
    }

    const role = await Role.findByIdAndUpdate(
      req.params.id,
      { $set: payload },
      { new: true, runValidators: true }
    ).populate('dataScopeRule');
    if (!role) return res.status(404).json({ error: 'Role not found.' });
    res.json({ data: role });
  } catch (error) {
    console.error('updateRole error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const role = await Role.findByIdAndDelete(req.params.id);
    if (!role) return res.status(404).json({ error: 'Role not found.' });
    res.json({ message: 'Role deleted successfully.' });
  } catch (error) {
    console.error('deleteRole error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updatePermissions = async (req, res) => {
  try {
    const { permissions } = req.body;
    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ error: 'permissions array is required.' });
    }
    const role = await Role.findByIdAndUpdate(
      req.params.id,
      { $set: { permissions: normalizePermissions(permissions) } },
      { new: true, runValidators: true }
    ).populate('dataScopeRule');
    if (!role) return res.status(404).json({ error: 'Role not found.' });
    res.json({ data: role });
  } catch (error) {
    console.error('updatePermissions error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.listPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find();
    res.json({ data: permissions });
  } catch (error) {
    console.error('listPermissions error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createPermission = async (req, res) => {
  try {
    const { code, name, module, actions, description } = req.body;
    if (!code || !name || !module) return res.status(400).json({ error: 'code, name, and module are required.' });
    const existing = await Permission.findOne({ code });
    if (existing) return res.status(409).json({ error: 'Permission with this code already exists.' });
    const perm = await Permission.create({ code, name, module, actions: actions || [], description });
    res.status(201).json({ data: perm });
  } catch (error) {
    console.error('createPermission error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getPermission = async (req, res) => {
  try {
    const perm = await Permission.findById(req.params.id);
    if (!perm) return res.status(404).json({ error: 'Permission not found.' });
    res.json({ data: perm });
  } catch (error) {
    console.error('getPermission error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updatePermission = async (req, res) => {
  try {
    const perm = await Permission.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!perm) return res.status(404).json({ error: 'Permission not found.' });
    res.json({ data: perm });
  } catch (error) {
    console.error('updatePermission error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deletePermission = async (req, res) => {
  try {
    const perm = await Permission.findByIdAndDelete(req.params.id);
    if (!perm) return res.status(404).json({ error: 'Permission not found.' });
    res.json({ message: 'Permission deleted successfully.' });
  } catch (error) {
    console.error('deletePermission error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.listDataScopeRules = async (req, res) => {
  try {
    const rules = await DataScopeRule.find();
    res.json({ data: rules });
  } catch (error) {
    console.error('listDataScopeRules error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createDataScopeRule = async (req, res) => {
  try {
    const { name, scopeType, scopeValue } = req.body;
    if (!name || !scopeType) return res.status(400).json({ error: 'name and scopeType are required.' });
    const rule = await DataScopeRule.create({ name, scopeType, scopeValue });
    res.status(201).json({ data: rule });
  } catch (error) {
    console.error('createDataScopeRule error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getDataScopeRule = async (req, res) => {
  try {
    const rule = await DataScopeRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ error: 'DataScopeRule not found.' });
    res.json({ data: rule });
  } catch (error) {
    console.error('getDataScopeRule error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateDataScopeRule = async (req, res) => {
  try {
    const rule = await DataScopeRule.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!rule) return res.status(404).json({ error: 'DataScopeRule not found.' });
    res.json({ data: rule });
  } catch (error) {
    console.error('updateDataScopeRule error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteDataScopeRule = async (req, res) => {
  try {
    const rule = await DataScopeRule.findByIdAndDelete(req.params.id);
    if (!rule) return res.status(404).json({ error: 'DataScopeRule not found.' });
    res.json({ message: 'DataScopeRule deleted successfully.' });
  } catch (error) {
    console.error('deleteDataScopeRule error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
