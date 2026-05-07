// ============================================================
// routes/auth.js — Login & Registration endpoints
// ============================================================

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const Tenant   = require('../models/Tenant');
const router   = express.Router();

// POST /api/auth/register — Create a new tenant account
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, preferences } = req.body;

    // Check if email already exists
    const existing = await Tenant.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash the password before saving (salt rounds = 10)
    const hashedPassword = await bcrypt.hash(password, 10);

    const tenant = new Tenant({
      name, email, phone,
      password: hashedPassword,
      preferences: preferences || {}
    });

    await tenant.save();
    res.status(201).json({ message: 'Registration successful' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login — Returns a JWT on valid credentials
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await Tenant.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Sign a token with user id and role (expires in 24 hours)
    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, role: user.role, email: user.email }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
