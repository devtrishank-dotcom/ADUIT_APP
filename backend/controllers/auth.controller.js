const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, employeeCode: user.employeeCode },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  employeeCode: user.employeeCode,
  designation: user.designation,
  department: user.department,
  branch: user.branch,
  roles: user.roles,
  preferences: user.preferences,
});

exports.login = async (req, res) => {
  try {
    const { employeeCode, password } = req.body;

    if (!employeeCode || !password) {
      return res.status(400).json({ error: 'employeeCode and password are required.' });
    }

    const user = await User.findOne({ employeeCode }).populate({
      path: 'roles',
      populate: { path: 'dataScopeRule' },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account is inactive. Contact your administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = generateToken(user);
    const refreshToken = uuidv4();

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    res.json({
      token,
      refreshToken,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required.' });
    }

    const user = await User.findOne({ refreshToken }).populate({
      path: 'roles',
      populate: { path: 'dataScopeRule' },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid refresh token.' });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account is inactive.' });
    }

    const token = generateToken(user);
    const newRefreshToken = uuidv4();

    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      token,
      refreshToken: newRefreshToken,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.logout = async (req, res) => {
  try {
    req.user.refreshToken = null;
    await req.user.save();

    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-passwordHash -refreshToken')
      .populate({
        path: 'roles',
        populate: { path: 'dataScopeRule' },
      })
      .populate('branch');

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const { language, theme } = req.body;
    const updateFields = {};

    if (language !== undefined) {
      updateFields['preferences.language'] = language;
    }
    if (theme !== undefined) {
      updateFields['preferences.theme'] = theme;
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'No valid update fields provided (language, theme).' });
    }

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updateFields }, { new: true })
      .select('-passwordHash -refreshToken')
      .populate({
        path: 'roles',
        populate: { path: 'dataScopeRule' },
      });

    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('UpdateMe error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user._id);

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.refreshToken = null;
    await user.save();

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('ChangePassword error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
