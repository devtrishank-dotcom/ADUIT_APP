const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const authController = require('../controllers/auth.controller');

router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', auth, authController.logout);
router.get('/me', auth, authController.getMe);
router.put('/me', auth, authController.updateMe);
router.post('/change-password', auth, authController.changePassword);

module.exports = router;
