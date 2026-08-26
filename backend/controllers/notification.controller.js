const Notification = require('../models/Notification');
const NotificationTemplate = require('../models/NotificationTemplate');

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 50, isRead } = req.query;
    const query = { user: req.user._id };
    if (isRead !== undefined) query.isRead = isRead === 'true';
    const total = await Notification.countDocuments(query);
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ data: notifications, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    console.error('list notifications error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: 'Notification not found.' });
    res.json({ data: notification });
  } catch (error) {
    console.error('markRead error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('markAllRead error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.unreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ user: req.user._id, isRead: false });
    res.json({ data: { unreadCount: count } });
  } catch (error) {
    console.error('unreadCount error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.listTemplates = async (req, res) => {
  try {
    const templates = await NotificationTemplate.find().sort({ eventType: 1 });
    res.json({ data: templates });
  } catch (error) {
    console.error('listTemplates error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createTemplate = async (req, res) => {
  try {
    const { eventType, title, messageBody, channels, active } = req.body;
    if (!eventType || !title || !messageBody) {
      return res.status(400).json({ error: 'eventType, title, and messageBody are required.' });
    }
    const existing = await NotificationTemplate.findOne({ eventType });
    if (existing) return res.status(409).json({ error: 'A template for this event already exists.' });
    const template = await NotificationTemplate.create({
      eventType,
      title,
      messageBody,
      channels: channels?.length ? channels : ['IN_APP'],
      active: active !== false,
    });
    res.status(201).json({ data: template });
  } catch (error) {
    console.error('createTemplate error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getTemplate = async (req, res) => {
  try {
    const template = await NotificationTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found.' });
    res.json({ data: template });
  } catch (error) {
    console.error('getTemplate error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    const { title, messageBody, channels, active } = req.body;
    const template = await NotificationTemplate.findByIdAndUpdate(
      req.params.id,
      { $set: { title, messageBody, channels, active } },
      { new: true, runValidators: true }
    );
    if (!template) return res.status(404).json({ error: 'Template not found.' });
    res.json({ data: template });
  } catch (error) {
    console.error('updateTemplate error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const template = await NotificationTemplate.findByIdAndDelete(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found.' });
    res.json({ message: 'Template deleted successfully.' });
  } catch (error) {
    console.error('deleteTemplate error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
