// ============================================================
// routes/maintenance.js — Maintenance request endpoints
// ============================================================

const express     = require('express');
const Maintenance = require('../models/Maintenance');
const { verifyToken, adminOnly } = require('../middleware/auth');
const router      = express.Router();

// GET /api/maintenance — Admin sees all; tenant sees only their own
router.get('/', verifyToken, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'tenant') {
      query.tenantId = req.user.id;  // Tenants can only see their own requests
    }
    const requests = await Maintenance.find(query)
      .populate('tenantId', 'name email')
      .populate('roomId', 'roomNumber')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/maintenance — Tenant submits a new request
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description, roomId } = req.body;
    const request = new Maintenance({
      tenantId: req.user.id,
      roomId,
      title,
      description
    });
    await request.save();
    res.status(201).json(request);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/maintenance/:id — Admin updates status of a request
router.put('/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const request = await Maintenance.findByIdAndUpdate(
      req.params.id,
      { status, adminNote },
      { new: true }
    );
    if (!request) return res.status(404).json({ message: 'Request not found' });
    res.json(request);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
