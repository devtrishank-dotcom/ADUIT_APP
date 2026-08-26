const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    zone: { type: String },
    region: { type: String },
    address: { type: String },
    controllingOfficeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    category: { type: String },
    status: { type: String, enum: ['active', 'closed'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Branch', branchSchema);
