const mongoose = require('mongoose');

const auditTypeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    defaultFrequency: {
      type: String,
      enum: ['Monthly', 'Quarterly', 'HalfYearly', 'Annual'],
    },
    currentTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
    workflowDefId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowDefinition' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditType', auditTypeSchema);
