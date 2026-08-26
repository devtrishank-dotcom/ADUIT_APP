const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    permissions: [
      {
        module: { type: String, required: true },
        actions: [{ type: String }],
        fieldRestrictions: [
          {
            fieldCode: { type: String },
            canView: { type: Boolean, default: true },
            canEdit: { type: Boolean, default: false },
          },
        ],
      },
    ],
    dataScopeRule: { type: mongoose.Schema.Types.ObjectId, ref: 'DataScopeRule' },
    isSystemRole: { type: Boolean, default: false },
    dashboardConfig: {
      widgets: { type: mongoose.Schema.Types.Mixed },
      layout: { type: mongoose.Schema.Types.Mixed },
      menuItems: { type: mongoose.Schema.Types.Mixed },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Role', roleSchema);
