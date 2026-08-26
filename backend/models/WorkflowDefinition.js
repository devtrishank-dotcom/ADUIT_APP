const mongoose = require('mongoose');

const workflowDefinitionSchema = new mongoose.Schema(
  {
    auditType: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditType', required: true },
    version: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Draft', 'Published', 'Archived'],
      default: 'Draft',
    },
    subjectType: {
      type: String,
      enum: ['AuditPlan', 'AuditInstance', 'Observation'],
      required: true,
    },
    stages: [
      {
        sequence: { type: Number, required: true },
        name: { type: String, required: true },
        actorRole: { type: String, required: true },
        actionsAllowed: [{ type: String }],
        slaHours: { type: Number },
        slaWorkingDays: { type: Boolean, default: false },
        entryCondition: { type: String },
        isParallelGroup: { type: Boolean, default: false },
        fallbackRole: { type: String },
        notifications: [
          {
            event: { type: String },
            channel: { type: String },
            template: { type: String },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkflowDefinition', workflowDefinitionSchema);
