const mongoose = require('mongoose');

const financialYearSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isOpen: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FinancialYear', financialYearSchema);
