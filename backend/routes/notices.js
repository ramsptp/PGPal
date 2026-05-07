// ============================================================
// routes/notices.js — Notice board endpoints
// ============================================================

const express = require('express');
const Notice  = require('../models/Notice');
const { verifyToken, adminOnly } = require('../middleware/auth');
const router  = express.Router();

// GET /api/notices — All general notices (visible to all logged-in users)
router.get('/', verifyToken, async (req, res) => {
  try {
    const notices = await Notice.find({ targetType: 'General' })
      .sort({ createdAt: -1 });
    res.json(notices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/notices — Admin posts a new notice
router.post('/', verifyToken, adminOnly, async (req, res) => {
  try {
    const notice = new Notice(req.body);
    await notice.save();
    res.status(201).json(notice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/notices/:id — Admin deletes a notice
router.delete('/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    await Notice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notice deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
