const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: 'SYSTEM'
    },
    userName: {
      type: String,
      default: 'System Administrator'
    },
    action: {
      type: String,
      required: [true, 'Audit action is required']
    },
    resourceType: {
      type: String,
      required: [true, 'Resource type is required']
    },
    resourceId: {
      type: String,
      default: ''
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1'
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

module.exports = mongoose.model('AuditLog', auditLogSchema);
