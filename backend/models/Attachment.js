const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    auditInstance: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditInstance' },
    fieldCode: { type: String },
    observation: { type: mongoose.Schema.Types.ObjectId, ref: 'Observation' },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileType: { type: String },
    fileSize: { type: Number },
    fileHash: { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Attachment', attachmentSchema);
