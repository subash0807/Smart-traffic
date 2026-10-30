const mongoose = require('mongoose');

const sensorSchema = new mongoose.Schema(
  {
    sensorId: {
      type: String,
      required: [true, 'Sensor ID is required'],
      unique: true,
      trim: true
    },
    location: {
      type: String,
      required: [true, 'Junction location is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['INDUCTIVE_LOOP', 'CAMERA', 'RADAR', 'INFRARED'],
      default: 'CAMERA'
    },
    status: {
      type: String,
      enum: ['ONLINE', 'OFFLINE', 'MAINTENANCE'],
      default: 'ONLINE'
    },
    lastReceivedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Sensor', sensorSchema);
