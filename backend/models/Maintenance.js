// ============================================================
// models/Maintenance.js — Schema for maintenance requests
// ============================================================

const mongoose = require('mongoose');

const MaintenanceSchema = new mongoose.Schema({

  // Who filed the complaint
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },

  // Which room the issue is in
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },

  // Short title, e.g. "Leaking tap"
  title: {
    type: String,
    required: true,
    trim: true
  },

  // Detailed description of the problem
  description: {
    type: String,
    required: true
  },

  // Admin updates this as work progresses
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Resolved'],
    default: 'Pending'
  },

  // Admin can leave a note when updating the status
  adminNote: {
    type: String,
    default: ''
  }

}, { timestamps: true });

module.exports = mongoose.model('Maintenance', MaintenanceSchema);
