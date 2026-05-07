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
    enum: ['Single', 'Double', 'Triple', 'Quad', '5-Sharing'],
    required: true
  },

  pricePerMonth: {
    type: Number,
    required: true,
    min: 0
  },

  // Auto-derived from type — Single=1, Double=2, Triple=3, Quad=4, 5-Sharing=5
  capacity: {
    type: Number,
    default: 1
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

const TYPE_CAPACITY = { 'Single': 1, 'Double': 2, 'Triple': 3, 'Quad': 4, '5-Sharing': 5 };

RoomSchema.pre('save', function(next) {
  // Capacity is always derived from the room type — no manual entry needed
  if (this.type) this.capacity = TYPE_CAPACITY[this.type] || 1;
  this.status = (this.occupiedBeds >= this.capacity) ? 'Occupied' : 'Vacant';
  next();
});

module.exports = mongoose.model('Room', RoomSchema);
