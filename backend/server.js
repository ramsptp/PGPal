// ============================================================
// server.js — Main entry point for PGPal Express application
// ============================================================

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const dotenv   = require('dotenv');
const path     = require('path');

// Load environment variables from .env file
dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────
app.use(cors());                        // Allow cross-origin requests from AngularJS frontend
app.use(express.json());                // Parse incoming JSON request bodies
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../frontend')));

// ── MongoDB Atlas Connection ─────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/rooms',        require('./routes/rooms'));
app.use('/api/tenants',      require('./routes/tenants'));
app.use('/api/maintenance',  require('./routes/maintenance'));
app.use('/api/notices',      require('./routes/notices'));
app.use('/api/matcher',      require('./routes/matcher'));

// ── Default route: serve the AngularJS SPA ──────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 PGPal server running at http://localhost:${PORT}`);
});
