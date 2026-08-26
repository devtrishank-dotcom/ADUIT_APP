const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. No token provided.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token has expired.' });
      }
      return res.status(401).json({ error: 'Invalid token.' });
    }

    const userId = decoded.id || decoded.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Invalid token payload.' });
    }

    const user = await User.findById(userId)
      .select('-passwordHash')
      .populate({
        path: 'roles',
        populate: { path: 'dataScopeRule' },
      });

    if (!user) {
      return res.status(401).json({ error: 'User not found. Token may be invalid.' });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account is inactive. Contact your administrator.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!req.user.roles || req.user.roles.length === 0) {
      return res.status(403).json({ error: 'Access denied. No roles assigned.' });
    }

    const hasRole = req.user.roles.some((role) => roles.includes(role.name));

    if (!hasRole) {
      return res.status(403).json({ error: 'Access denied. Insufficient role privileges.' });
    }

    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      req.user = null;
      return next();
    }

    const userId = decoded.id || decoded.userId;

    if (!userId) {
      req.user = null;
      return next();
    }

    const user = await User.findById(userId)
      .select('-passwordHash')
      .populate({
        path: 'roles',
        populate: { path: 'dataScopeRule' },
      });

    req.user = user && user.status === 'active' ? user : null;
    next();
  } catch (error) {
    console.error('Optional Auth Middleware Error:', error);
    req.user = null;
    next();
  }
};

module.exports = { auth, restrictTo, optionalAuth };
