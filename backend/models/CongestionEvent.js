const mongoose = require('mongoose');

const congestionEventSchema = new mongoose.Schema(
  {
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      index: true
    },
    congestionLevel: {
      type: String,
      enum: ['NORMAL', 'MODERATE', 'HEAVY', 'SEVERE'],
      required: true
    },
    vehicleCount: {
      type: Number,
      required: true
    },
    avgSpeed: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'RESOLVED'],
      default: 'ACTIVE'
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('CongestionEvent', congestionEventSchema);
