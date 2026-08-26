const mongoose = require('mongoose');

const complianceActionSchema = new mongoose.Schema(
  {
    observation: { type: mongoose.Schema.Types.ObjectId, ref: 'Observation', required: true },
    actionType: {
      type: String,
      enum: ['Response', 'Verification', 'Escalation'],
      required: true,
    },
    description: { type: String },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    submittedAt: { type: Date },
    statusBefore: { type: String },
    statusAfter: { type: String },
    evidenceAttachments: [
      {
        fileName: { type: String },
        filePath: { type: String },
        fileType: { type: String },
        fileSize: { type: Number },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('ComplianceAction', complianceActionSchema);
