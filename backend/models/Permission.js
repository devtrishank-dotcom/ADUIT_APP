const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    module: { type: String, required: true },
    actions: [{ type: String }],
    description: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Permission', permissionSchema);
