const mongoose = require('mongoose');

const riskConfigSchema = new mongoose.Schema(
  {
    auditType: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditType', required: true },
    level: {
      type: String,
      enum: ['field', 'section', 'template'],
      required: true,
    },
    name: { type: String, required: true },
    weight: { type: Number },
    formulaRef: { type: String },
    bandDefinitions: [
      {
        bandName: { type: String },
        bandColor: { type: String },
        minScore: { type: Number },
        maxScore: { type: Number },
        description: { type: String },
      },
    ],
    specialRules: [
      {
        condition: { type: String },
        forceBand: { type: String },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('RiskConfig', riskConfigSchema);
