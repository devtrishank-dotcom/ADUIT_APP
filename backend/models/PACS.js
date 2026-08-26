const mongoose = require('mongoose');

const pacsSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    registrationNumber: { type: String },
    linkedBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    taluka: { type: String },
    village: { type: String },
    workArea: { type: String },
    category: { type: String },
    class_grade: { type: String },
    registrationDate: { type: Date },
    status: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PACS', pacsSchema);
