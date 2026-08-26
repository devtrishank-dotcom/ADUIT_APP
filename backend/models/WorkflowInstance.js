const mongoose = require('mongoose');

const workflowInstanceSchema = new mongoose.Schema(
  {
    subjectType: { type: String, required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, required: true },
    workflowDef: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowDefinition', required: true },
    currentStageIndex: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Active', 'Completed', 'Overdue', 'Escalated', 'Cancelled'],
      default: 'Active',
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkflowInstance', workflowInstanceSchema);
