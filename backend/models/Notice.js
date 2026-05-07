// ============================================================
// models/Notice.js — Schema for admin notice board posts
// ============================================================

const mongoose = require('mongoose');

const NoticeSchema = new mongoose.Schema({

  title: {
    type: String,
    required: true,
    trim: true
  },

  message: {
    type: String,
    required: true
  },

  // "General" notices appear for all tenants; "Room" notices target a specific room
  targetType: {
    type: String,
    enum: ['General', 'Room'],
    default: 'General'
  },

  // Only used when targetType is "Room"
  targetRoomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    default: null
  }

}, { timestamps: true });

module.exports = mongoose.model('Notice', NoticeSchema);
