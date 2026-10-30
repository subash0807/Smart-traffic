const mongoose = require('mongoose');

const emergencyRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    vehicleId: {
      type: String,
      required: [true, 'Vehicle ID is required'],
      trim: true
    },
    vehicleType: {
      type: String,
      enum: ['AMBULANCE', 'FIRE_ENGINE', 'POLICE'],
      default: 'AMBULANCE'
    },
    origin: {
      type: String,
      required: [true, 'Origin is required'],
      trim: true
    },
    destination: {
      type: String,
      required: [true, 'Destination is required'],
      trim: true
    },
    affectedJunctions: [
      {
        type: String,
        trim: true
      }
    ],
    priority: {
      type: String,
      enum: ['HIGH', 'CRITICAL'],
      default: 'CRITICAL'
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'],
      default: 'PENDING',
      index: true
    },
    recommendedPlan: {
      type: String,
      default: ''
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    approvedBy: {
      type: String,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('EmergencyRequest', emergencyRequestSchema);
