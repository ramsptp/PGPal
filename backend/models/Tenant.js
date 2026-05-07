// ============================================================
// models/Tenant.js — Mongoose Schema for a PG Tenant
// ============================================================

const mongoose = require('mongoose');

const TenantSchema = new mongoose.Schema({

  name: {
    type: String,
    required: [true, 'Tenant name is required'],
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  phone: {
    type: String,
    required: true
  },

  // Reference to the Room this tenant lives in
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',     // Enables .populate('roomId') to get room details
    default: null
  },

  moveInDate: {
    type: Date,
    default: Date.now
  },

  // Rent is due on this day of each month (e.g., 5 = 5th of every month)
  rentDueDay: {
    type: Number,
    default: 5,
    min: 1,
    max: 28
  },

  // Password (hashed) — used for tenant login
  password: {
    type: String,
    required: true
  },

  // Role field to distinguish admin vs tenant in the same users collection
  role: {
    type: String,
    enum: ['admin', 'tenant'],
    default: 'tenant'
  },

  // ── Roommate Matcher Attributes ───────────────────────────
  // These JSON fields are compared to find compatible roommates
  preferences: {
    sleepSchedule: {
      type: String,
      enum: ['Early Bird', 'Night Owl', 'Flexible'],
      default: 'Flexible'
    },
    hobbies: {
      type: [String],   // e.g. ["Reading", "Gaming", "Music"]
      default: []
    },
    smokingAllowed: {
      type: Boolean,
      default: false
    },
    guestPolicy: {
      type: String,
      enum: ['No Guests', 'Occasional', 'Frequent'],
      default: 'Occasional'
    }
  }

}, { timestamps: true });

module.exports = mongoose.model('Tenant', TenantSchema);
