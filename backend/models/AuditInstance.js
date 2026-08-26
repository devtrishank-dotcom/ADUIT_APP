const mongoose = require('mongoose');

const auditInstanceSchema = new mongoose.Schema(
  {
    planItem: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditPlanItem', default: null },
    auditType: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditType', required: true },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
    workflowDef: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowDefinition' },
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    periodFrom: { type: Date },
    periodTo: { type: Date },
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startedAt: { type: Date },
    submittedAt: { type: Date },
    completedAt: { type: Date },
    status: {
      type: String,
      enum: [
        'Draft',
        'InProgress',
        'Submitted',
        'UnderReview',
        'ReturnedForRework',
        'Approved',
        'ComplianceTracking',
        'Closed',
      ],
      default: 'Draft',
    },
    overallRiskScore: { type: Number },
    overallRiskBand: { type: String },
    workflowInstance: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowInstance' },
    closureCertificate: { type: mongoose.Schema.Types.ObjectId, ref: 'ClosureCertificate' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditInstance', auditInstanceSchema);
