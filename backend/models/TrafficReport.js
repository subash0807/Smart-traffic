const mongoose = require('mongoose');

const trafficReportSchema = new mongoose.Schema(
  {
    reportType: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'CUSTOM'],
      default: 'DAILY'
    },
    dateRange: {
      from: {
        type: Date,
        required: true
      },
      to: {
        type: Date,
        required: true
      }
    },
    summary: {
      totalVehicles: { type: Number, default: 0 },
      avgSpeed: { type: Number, default: 0 },
      congestionFrequency: {
        normal: { type: Number, default: 0 },
        moderate: { type: Number, default: 0 },
        heavy: { type: Number, default: 0 },
        severe: { type: Number, default: 0 }
      },
      severeCongestionEvents: { type: Number, default: 0 },
      activeSignalsCount: { type: Number, default: 0 },
      emergencyPriorityCount: { type: Number, default: 0 },
      totalAlerts: { type: Number, default: 0 }
    },
    locationData: [
      {
        location: String,
        vehicleCount: Number,
        avgSpeed: Number,
        congestion: String
      }
    ],
    generatedBy: {
      type: String,
      default: 'SYSTEM'
    },
    generatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('TrafficReport', trafficReportSchema);
