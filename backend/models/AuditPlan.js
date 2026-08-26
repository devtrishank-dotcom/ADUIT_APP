const mongoose = require('mongoose');

const auditPlanSchema = new mongoose.Schema(
  {
    financialYear: { type: mongoose.Schema.Types.ObjectId, ref: 'FinancialYear', required: true },
    status: {
      type: String,
      enum: ['Draft', 'Submitted', 'Approved', 'Archived'],
      default: 'Draft',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditPlan', auditPlanSchema);
