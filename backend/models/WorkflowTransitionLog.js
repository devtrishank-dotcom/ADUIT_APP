const mongoose = require('mongoose');

const workflowTransitionLogSchema = new mongoose.Schema(
  {
    workflowInstance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkflowInstance',
      required: true,
    },
    fromStageIndex: { type: Number, required: true },
    toStageIndex: { type: Number, required: true },
    action: { type: String, required: true },
    actorUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comment: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkflowTransitionLog', workflowTransitionLogSchema);
