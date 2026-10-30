const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: String,
      required: [true, 'Vehicle ID is required'],
      unique: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['AMBULANCE', 'FIRE_ENGINE', 'POLICE', 'CAR', 'BUS', 'TRUCK'],
      required: [true, 'Vehicle type is required']
    },
    location: {
      type: String,
      required: [true, 'Current simulated location is required'],
      trim: true
    },
    destination: {
      type: String,
      required: [true, 'Destination is required'],
      trim: true
    },
    priority: {
      type: String,
      enum: ['NORMAL', 'HIGH', 'EMERGENCY'],
      default: 'NORMAL'
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'IDLE', 'EN_ROUTE'],
      default: 'IDLE'
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

module.exports = mongoose.model('Vehicle', vehicleSchema);
