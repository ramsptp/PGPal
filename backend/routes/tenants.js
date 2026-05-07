// ============================================================
// routes/tenants.js — Tenant management (Admin only)
// ============================================================

const express  = require('express');
const Tenant   = require('../models/Tenant');
const Room     = require('../models/Room');
const { verifyToken, adminOnly } = require('../middleware/auth');
const router   = express.Router();

// GET /api/tenants — All tenants with their room info (Admin only)
router.get('/', verifyToken, adminOnly, async (req, res) => {
  try {
    // .populate() replaces roomId ObjectId with the full Room document
    const tenants = await Tenant.find({ role: 'tenant' })
      .populate('roomId', 'roomNumber type')
      .select('-password');  // Never send password hashes to client
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tenants/me — Logged-in tenant's own profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.user.id)
      .populate('roomId')
      .select('-password');
    res.json(tenant);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/tenants/me/preferences — Tenant updates their own preferences
router.put('/me/preferences', verifyToken, async (req, res) => {
  try {
    const { preferences, roomPreferences } = req.body;
    const tenant = await Tenant.findByIdAndUpdate(
      req.user.id,
      { preferences, roomPreferences },
      { new: true, runValidators: true }
    ).select('-password');
    res.json(tenant);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/tenants/:id/assign-room — Assign a room to a tenant (Admin only)
router.put('/:id/assign-room', verifyToken, adminOnly, async (req, res) => {
  try {
    const { roomId } = req.body;
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    // Free the old room if tenant had one
    if (tenant.roomId) {
      await Room.findByIdAndUpdate(tenant.roomId, { $inc: { occupiedBeds: -1 } });
    }

    // Assign new room
    tenant.roomId = roomId;
    await tenant.save();

    room.occupiedBeds += 1;
    await room.save();  // pre-save hook will recalculate status

    res.json({ message: 'Room assigned successfully', tenant });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/tenants/:id — Remove a tenant (Admin only)
router.delete('/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    const tenant = await Tenant.findByIdAndDelete(req.params.id);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    // Free the room bed when tenant is removed
    if (tenant.roomId) {
      await Room.findByIdAndUpdate(tenant.roomId, { $inc: { occupiedBeds: -1 } });
    }
    res.json({ message: 'Tenant removed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
