const mongoose = require('mongoose');

const notificationTemplateSchema = new mongoose.Schema(
  {
    eventType: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    messageBody: { type: String, required: true },
    channels: {
      type: [{ type: String, enum: ['EMAIL', 'SMS', 'IN_APP', 'PUSH'] }],
      default: ['IN_APP'],
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('NotificationTemplate', notificationTemplateSchema);
