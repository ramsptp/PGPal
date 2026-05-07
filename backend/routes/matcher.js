// ============================================================
// routes/matcher.js — Roommate compatibility matching logic
// ============================================================
// Algorithm: Compare preference JSON attributes between tenants.
// Each matching attribute adds points to a compatibility score.
// Returns tenants sorted from most to least compatible.
// ============================================================

const express = require('express');
const Tenant  = require('../models/Tenant');
const { verifyToken } = require('../middleware/auth');
const router  = express.Router();

// Scoring weights for each preference field
const WEIGHTS = {
  sleepSchedule: 50,   // Most important lifestyle factor
  guestPolicy:   30,   // Moderate importance
  hobbies:       10    // Bonus points per shared hobby
};

function calculateScore(p1, p2) {
  let score = 0;

  if (p1.sleepSchedule === p2.sleepSchedule) score += WEIGHTS.sleepSchedule;
  if (p1.guestPolicy === p2.guestPolicy)     score += WEIGHTS.guestPolicy;

  // Count how many hobbies are shared
  const sharedHobbies = (p1.hobbies || []).filter(h => (p2.hobbies || []).includes(h));
  score += sharedHobbies.length * WEIGHTS.hobbies;

  return { score, sharedHobbies };
}

// GET /api/matcher — Find compatible roommates for the logged-in tenant
router.get('/', verifyToken, async (req, res) => {
  try {
    // Get the requesting tenant's preferences
    const currentTenant = await Tenant.findById(req.user.id).select('preferences name');
    if (!currentTenant) return res.status(404).json({ message: 'Tenant not found' });

    // Get all other tenants (exclude self and admin accounts)
    const others = await Tenant.find({
      _id:  { $ne: req.user.id },
      role: 'tenant'
    }).select('name preferences roomId').populate('roomId', 'roomNumber');

    // Calculate a compatibility score for each tenant
    const results = others.map(other => {
      const { score, sharedHobbies } = calculateScore(
        currentTenant.preferences,
        other.preferences
      );
      return {
        tenantId:     other._id,
        name:         other.name,
        room:         other.roomId ? other.roomId.roomNumber : 'Unassigned',
        score,
        sharedHobbies,
        preferences:  other.preferences
      };
    });

    // Sort descending by score so best matches appear first
    results.sort((a, b) => b.score - a.score);

    res.json({
      currentTenant: { name: currentTenant.name, preferences: currentTenant.preferences },
      matches: results
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
