const mongoose = require('mongoose');

const dataScopeRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    scopeType: {
      type: String,
      enum: ['All', 'Zone', 'Branch', 'PACS', 'Own'],
      required: true,
    },
    scopeValue: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DataScopeRule', dataScopeRuleSchema);
