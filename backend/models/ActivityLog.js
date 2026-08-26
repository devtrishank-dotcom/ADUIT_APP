const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    actorUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    action: { type: String, required: true },
    beforeJson: { type: mongoose.Schema.Types.Mixed },
    afterJson: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
