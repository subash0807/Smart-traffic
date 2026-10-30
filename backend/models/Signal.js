const mongoose = require('mongoose');

const signalSchema = new mongoose.Schema(
  {
    signalId: {
      type: String,
      required: [true, 'Signal ID is required'],
      unique: true,
      trim: true
    },
    location: {
      type: String,
      required: [true, 'Junction location is required'],
      trim: true
    },
    latitude: {
      type: Number,
      required: [true, 'Latitude is required']
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required']
    },
    status: {
      type: String,
      enum: ['RED', 'YELLOW', 'GREEN'],
      default: 'GREEN'
    },
    mode: {
      type: String,
      enum: ['AUTOMATIC', 'MANUAL'],
      default: 'AUTOMATIC'
    },
    duration: {
      type: Number,
      default: 45, // seconds
      min: [5, 'Duration must be at least 5 seconds'],
      max: [180, 'Duration cannot exceed 180 seconds']
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    stateHistory: [
      {
        previousStatus: String,
        newStatus: String,
        changedBy: String,
        mode: String,
        timestamp: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Signal', signalSchema);
