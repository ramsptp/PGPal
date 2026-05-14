// ============================================================
// routes/rent.js — Rent receipt submission and verification
// ============================================================

const express     = require('express');
const RentPayment = require('../models/RentPayment');
const Tenant      = require('../models/Tenant');
const { verifyToken, adminOnly } = require('../middleware/auth');
const router      = express.Router();

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// GET /api/rent — Admin sees all; tenant sees only their own
router.get('/', verifyToken, async (req, res) => {
  try {
    const query = req.user.role === 'tenant' ? { tenantId: req.user.id } : {};
    const payments = await RentPayment.find(query)
      .populate('tenantId', 'name email')
      .populate('roomId', 'roomNumber')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/rent/stats — Pending receipt count for admin dashboard
router.get('/stats', verifyToken, adminOnly, async (req, res) => {
  try {
    const pending = await RentPayment.countDocuments({ status: 'Pending' });
    res.json({ pending });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/rent — Tenant submits a payment receipt
router.post('/', verifyToken, async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.user.id);
    if (!tenant.roomId) {
      return res.status(400).json({ message: 'You must be assigned to a room first.' });
    }

    // Prevent duplicate submission for the same month/year
    const existing = await RentPayment.findOne({
      tenantId: req.user.id,
      month: req.body.month,
      year:  req.body.year,
      status: { $in: ['Pending', 'Confirmed'] }
    });
    if (existing) {
      return res.status(400).json({
        message: `A receipt for ${MONTHS[req.body.month - 1]} ${req.body.year} already exists.`
      });
    }

    const payment = new RentPayment({
      tenantId:      req.user.id,
      roomId:        tenant.roomId,
      month:         req.body.month,
      year:          req.body.year,
      amount:        req.body.amount,
      referenceNote: req.body.referenceNote
    });
    await payment.save();
    res.status(201).json(payment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/rent/:id — Admin confirms or rejects a receipt
router.put('/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const payment = await RentPayment.findByIdAndUpdate(
      req.params.id,
      { status, adminNote },
      { new: true }
    ).populate('tenantId', 'name').populate('roomId', 'roomNumber');
    if (!payment) return res.status(404).json({ message: 'Receipt not found' });
    res.json(payment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
