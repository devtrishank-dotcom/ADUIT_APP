const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    employeeCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    department: { type: String },
    designation: { type: String },
    passwordHash: { type: String, required: true },
    eSignRef: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    refreshToken: { type: String },
    lastLogin: { type: Date },
    roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
    preferences: {
      language: { type: String, default: 'en' },
      theme: { type: String, default: 'light' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
