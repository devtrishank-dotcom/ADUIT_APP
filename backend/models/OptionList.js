const mongoose = require('mongoose');

const optionItemSchema = new mongoose.Schema(
  {
    value: { type: mongoose.Schema.Types.Mixed },
    labelEn: { type: String },
    labelGu: { type: String },
    riskPoints: { type: Number },
    severity: { type: String },
    sequence: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const optionListSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    isShared: { type: Boolean, default: false },
    items: [optionItemSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('OptionList', optionListSchema);
