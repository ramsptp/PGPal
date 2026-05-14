// ============================================================
// models/RentPayment.js — Rent receipt submission & verification
// ============================================================

const mongoose = require('mongoose');

const RentPaymentSchema = new mongoose.Schema({

  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },

  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },

  // Month and year the payment is for (e.g. May 2026)
  month: { type: Number, required: true, min: 1, max: 12 },
  year:  { type: Number, required: true },

  amount: { type: Number, required: true, min: 0 },

  // UPI transaction ID, bank reference, etc.
  referenceNote: { type: String, required: true, trim: true },

  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Rejected'],
    default: 'Pending'
  },

  adminNote: { type: String, default: '' }

}, { timestamps: true });

module.exports = mongoose.model('RentPayment', RentPaymentSchema);
