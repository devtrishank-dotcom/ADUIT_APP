const mongoose = require('mongoose');

const closureCertificateSchema = new mongoose.Schema(
  {
    auditInstance: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditInstance', required: true },
    certificateNumber: { type: String, unique: true },
    generatedAt: { type: Date },
    signedBy_hia: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    signedBy_auditor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    remarks: { type: String },
    pdfPath: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ClosureCertificate', closureCertificateSchema);
