const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    alertId: {
      type: String,
      unique: true,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: [
        'MODERATE_CONGESTION',
        'HEAVY_CONGESTION',
        'SEVERE_CONGESTION',
        'SENSOR_OFFLINE',
        'EMERGENCY_REQUEST',
        'SYSTEM_ERROR'
      ],
      required: true
    },
    message: {
      type: String,
      required: [true, 'Alert message is required']
    },
    location: {
      type: String,
      required: [true, 'Alert location is required'],
      trim: true
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM'
    },
    status: {
      type: String,
      enum: ['NEW', 'ACKNOWLEDGED', 'RESOLVED'],
      default: 'NEW',
      index: true
    },
    acknowledgedBy: {
      type: String,
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
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

module.exports = mongoose.model('Alert', alertSchema);
