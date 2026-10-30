const mongoose = require('mongoose');

const trafficSchema = new mongoose.Schema(
  {
    location: {
      type: String,
      required: [true, 'Location name is required'],
      trim: true,
      index: true
    },
    latitude: {
      type: Number,
      required: [true, 'Latitude is required']
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required']
    },
    vehicleCount: {
      type: Number,
      required: [true, 'Vehicle count is required'],
      min: [0, 'Vehicle count cannot be negative']
    },
    avgSpeed: {
      type: Number,
      required: [true, 'Average speed is required'],
      min: [0, 'Average speed cannot be negative']
    },
    congestion: {
      type: String,
      enum: ['NORMAL', 'MODERATE', 'HEAVY', 'SEVERE'],
      default: 'NORMAL',
      index: true
    },
    sensorId: {
      type: String,
      default: 'SEN-DEFAULT',
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    dataSource: {
      type: String,
      enum: ['SIMULATED', 'SENSOR', 'MANUAL'],
      default: 'SIMULATED'
    }
  },
  {
    timestamps: true
  }
);

trafficSchema.index({ location: 1, timestamp: -1 });

module.exports = mongoose.model('Traffic', trafficSchema);
