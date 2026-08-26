const bcrypt = require('bcryptjs');
const User = require('../models/User');

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeCode: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-passwordHash -refreshToken')
      .populate('roles')
      .populate('branch')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ data: users, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    console.error('list users error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.get = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-passwordHash -refreshToken')
      .populate('roles')
      .populate('branch');

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ data: user });
  } catch (error) {
    console.error('get user error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { employeeCode, name, email, password, mobile, branch, department, designation, roles } = req.body;

    if (!employeeCode || !name || !email || !password) {
      return res.status(400).json({ error: 'employeeCode, name, email, and password are required.' });
    }

    const existing = await User.findOne({ $or: [{ employeeCode }, { email }] });
    if (existing) {
      return res.status(409).json({ error: 'User with this employeeCode or email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      employeeCode,
      name,
      email,
      passwordHash,
      mobile,
      branch,
      department,
      designation,
      roles: roles || [],
    });

    const created = await User.findById(user._id)
      .select('-passwordHash -refreshToken')
      .populate('roles')
      .populate('branch');

    res.status(201).json({ data: created });
  } catch (error) {
    console.error('create user error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, email, mobile, branch, department, designation, status, roles } = req.body;
    const updateFields = {};

    if (name !== undefined) updateFields.name = name;
    if (email !== undefined) updateFields.email = email;
    if (mobile !== undefined) updateFields.mobile = mobile;
    if (branch !== undefined) updateFields.branch = branch;
    if (department !== undefined) updateFields.department = department;
    if (designation !== undefined) updateFields.designation = designation;
    if (status !== undefined) updateFields.status = status;
    if (roles !== undefined) updateFields.roles = roles;

    if (email) {
      const dup = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (dup) {
        return res.status(409).json({ error: 'Email already in use.' });
      }
    }

    const user = await User.findByIdAndUpdate(req.params.id, { $set: updateFields }, { new: true })
      .select('-passwordHash -refreshToken')
      .populate('roles')
      .populate('branch');

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ data: user });
  } catch (error) {
    console.error('update user error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.delete = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ message: 'User deactivated successfully.' });
  } catch (error) {
    console.error('delete user error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.assignRoles = async (req, res) => {
  try {
    const { roles } = req.body;

    if (!roles || !Array.isArray(roles)) {
      return res.status(400).json({ error: 'roles must be an array of role IDs.' });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { $set: { roles } }, { new: true })
      .select('-passwordHash -refreshToken')
      .populate('roles');

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ data: user });
  } catch (error) {
    console.error('assignRoles error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getAuditors = async (req, res) => {
  try {
    const Role = require('../models/Role');
    const auditorRole = await Role.findOne({ name: 'Auditor' });

    if (!auditorRole) {
      return res.json({ data: [] });
    }

    const users = await User.find({ roles: auditorRole._id, status: 'active' })
      .select('_id name employeeCode designation department');

    res.json({ data: users });
  } catch (error) {
    console.error('getAuditors error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getBranchManagers = async (req, res) => {
  try {
    const Role = require('../models/Role');
    const bmRole = await Role.findOne({ name: 'Branch Manager' });

    if (!bmRole) {
      return res.json({ data: [] });
    }

    const users = await User.find({ roles: bmRole._id, status: 'active' })
      .select('_id name employeeCode designation department branch')
      .populate('branch', 'name code');

    res.json({ data: users });
  } catch (error) {
    console.error('getBranchManagers error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
