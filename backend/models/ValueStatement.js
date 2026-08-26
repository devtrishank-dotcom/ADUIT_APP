const mongoose = require('mongoose');

const valueStatementSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    textEn: { type: String },
    textGu: { type: String },
    category: { type: String },
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ValueStatement', valueStatementSchema);
