const mongoose = require('mongoose');

const demoSeedMarkerSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    description: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DemoSeedMarker', demoSeedMarkerSchema);
