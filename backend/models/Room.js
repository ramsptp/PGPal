// ============================================================
// models/Room.js — Mongoose Schema for a PG Room
// ============================================================

const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({

  roomNumber: {
    type: String,
    required: [true, 'Room number is required'],
    unique: true,
    trim: true   // e.g. "101", "A-202"
  },

  type: {
    type: String,
    enum: ['Single', 'Double', 'Triple'],  // Only these values are allowed
    required: true
  },

  pricePerMonth: {
    type: Number,
    required: true,
    min: 0
  },

  // Maximum number of beds in this room
  capacity: {
    type: Number,
    required: true
  },

  // How many tenants are currently assigned
  occupiedBeds: {
    type: Number,
    default: 0
  },

  // List of amenities available in the room
  amenities: {
    type: [String],   // e.g. ["AC", "WiFi", "Attached Bathroom"]
    default: []
  },

  // "Vacant" if occupiedBeds < capacity, else "Occupied"
  status: {
    type: String,
    enum: ['Vacant', 'Occupied'],
    default: 'Vacant'
  }

}, { timestamps: true });  // Adds createdAt and updatedAt automatically

// Auto-update status whenever occupiedBeds changes
RoomSchema.pre('save', function(next) {
  this.status = (this.occupiedBeds >= this.capacity) ? 'Occupied' : 'Vacant';
  next();
});

module.exports = mongoose.model('Room', RoomSchema);
