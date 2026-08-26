const mongoose = require('mongoose');

const auditResponseSchema = new mongoose.Schema(
  {
    auditInstance: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditInstance', required: true },
    sectionCode: { type: String, required: true },
    fieldCode: { type: String, required: true },
    gridRowIndex: { type: Number, default: -1 },
    columnCode: { type: String },
    value: { type: mongoose.Schema.Types.Mixed },
    riskPointsApplied: { type: Number },
    severity: { type: String },
    remarks: { type: String },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditResponse', auditResponseSchema);
