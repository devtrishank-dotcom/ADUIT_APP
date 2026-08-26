const mongoose = require('mongoose');

const observationSchema = new mongoose.Schema(
  {
    auditInstance: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditInstance', required: true },
    fieldCode: { type: String },
    sectionCode: { type: String },
    title: { type: String },
    description: { type: String },
    severity: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
    },
    targetDate: { type: Date },
    status: {
      type: String,
      enum: ['Open', 'PartiallyComplied', 'Complied', 'Verified', 'AcceptedRisk'],
      default: 'Open',
    },
    recurrenceOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Observation' },
    workflowInstanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowInstance' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Observation', observationSchema);
