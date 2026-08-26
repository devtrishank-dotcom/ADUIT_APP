const mongoose = require('mongoose');

const auditPlanItemSchema = new mongoose.Schema(
  {
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditPlan', required: true },
    auditType: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditType', required: true },
    entityType: { type: String, enum: ['Branch', 'PACS'], required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    periodFrom: { type: Date, required: true },
    periodTo: { type: Date, required: true },
    plannedStart: { type: Date },
    plannedEnd: { type: Date },
    actualStart: { type: Date },
    actualEnd: { type: Date },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Planned', 'Rescheduled', 'InProgress', 'Completed', 'Missed', 'Cancelled'],
      default: 'Planned',
    },
    rescheduleReason: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditPlanItem', auditPlanItemSchema);
