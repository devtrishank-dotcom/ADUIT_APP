const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventType: { type: String },
    subjectType: { type: String },
    subjectId: { type: mongoose.Schema.Types.ObjectId },
    channel: { type: String, enum: ['InApp', 'Email', 'SMS'] },
    title: { type: String },
    message: { type: String },
    isRead: { type: Boolean, default: false },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
