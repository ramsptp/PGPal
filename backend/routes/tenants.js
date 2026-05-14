// ============================================================
// routes/tenants.js — Tenant management (Admin only)
// ============================================================

const express  = require('express');
const bcrypt   = require('bcryptjs');
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

// PUT /api/tenants/:id/edit — Admin edits tenant details
router.put('/:id/edit', verifyToken, adminOnly, async (req, res) => {
  try {
    const { name, phone, rentDueDay } = req.body;
    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { name, phone, rentDueDay },
      { new: true, runValidators: true }
    ).select('-password').populate('roomId', 'roomNumber type');
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    res.json(tenant);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/tenants/me/profile — Tenant updates name, phone, and optionally password
router.put('/me/profile', verifyToken, async (req, res) => {
  try {
    const { name, phone, currentPassword, newPassword } = req.body;
    const tenant = await Tenant.findById(req.user.id);

    tenant.name  = name  || tenant.name;
    tenant.phone = phone || tenant.phone;

    if (newPassword) {
      const match = await bcrypt.compare(currentPassword, tenant.password);
      if (!match) return res.status(400).json({ message: 'Current password is incorrect.' });
      tenant.password = await bcrypt.hash(newPassword, 10);
    }

    await tenant.save();
    const result = tenant.toObject();
    delete result.password;
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
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

// PUT /api/tenants/:id/vacate — Remove tenant from their room (Admin only)
router.put('/:id/vacate', verifyToken, adminOnly, async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    if (!tenant.roomId) return res.status(400).json({ message: 'Tenant has no room.' });

    const oldRoom = await Room.findById(tenant.roomId);
    if (oldRoom) {
      oldRoom.occupiedBeds = Math.max(0, oldRoom.occupiedBeds - 1);
      await oldRoom.save(); // triggers pre-save hook to recalculate status
    }
    tenant.roomId = null;
    await tenant.save();
    res.json({ message: 'Tenant vacated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
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

    // Free the old room — use .save() so the pre-save hook recalculates status
    if (tenant.roomId) {
      const oldRoom = await Room.findById(tenant.roomId);
      if (oldRoom) {
        oldRoom.occupiedBeds = Math.max(0, oldRoom.occupiedBeds - 1);
        await oldRoom.save();
      }
    }

    // Assign new room and record the move-in date as today
    tenant.roomId     = roomId;
    tenant.moveInDate = new Date();
    await tenant.save();

    room.occupiedBeds += 1;
    await room.save();

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
      const oldRoom = await Room.findById(tenant.roomId);
      if (oldRoom) {
        oldRoom.occupiedBeds = Math.max(0, oldRoom.occupiedBeds - 1);
        await oldRoom.save();
      }
    }
    res.json({ message: 'Tenant removed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
