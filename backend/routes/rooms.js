// ============================================================
// routes/rooms.js — CRUD for Rooms (Admin only for C/U/D)
// ============================================================

const express  = require('express');
const Room     = require('../models/Room');
const { verifyToken, adminOnly } = require('../middleware/auth');
const router   = express.Router();

// GET /api/rooms — Fetch all rooms (accessible to all logged-in users)
router.get('/', verifyToken, async (req, res) => {
  try {
    const rooms = await Room.find().sort({ roomNumber: 1 });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/rooms/:id/occupants — Tenants currently in this room
router.get('/:id/occupants', verifyToken, adminOnly, async (req, res) => {
  try {
    const Tenant = require('../models/Tenant');
    const tenants = await Tenant.find({ roomId: req.params.id, role: 'tenant' })
      .select('name email phone moveInDate');
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/rooms/stats — Dashboard summary counts
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const total    = await Room.countDocuments();
    const occupied = await Room.countDocuments({ status: 'Occupied' });
    const vacant   = total - occupied;
    res.json({ total, occupied, vacant });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/rooms/:id — Single room detail
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/rooms — Add a new room (Admin only)
router.post('/', verifyToken, adminOnly, async (req, res) => {
  try {
    const room = new Room(req.body);
    await room.save();
    res.status(201).json(room);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

const TYPE_CAPACITY = { 'Single': 1, 'Double': 2, 'Triple': 3, 'Quad': 4, '5-Sharing': 5 };

// PUT /api/rooms/:id — Update room details (Admin only)
router.put('/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    // findByIdAndUpdate skips pre-save hooks, so set capacity manually
    if (req.body.type) req.body.capacity = TYPE_CAPACITY[req.body.type] || 1;
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/rooms/:id — Remove a room (Admin only)
router.delete('/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json({ message: 'Room deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
