const express = require('express');
const { listAbandonedCarts, getQueueStats, healthCheck } = require('../controllers/dashboardController');
const config = require('../config/env');

const router = express.Router();

// Lightweight token auth guard for dashboard routes
function dashboardAuth(req, res, next) {
  const token = req.headers['x-dashboard-secret'] || req.query.secret;
  if (token !== config.dashboard.secret) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

router.get('/health', healthCheck);
router.get('/carts', dashboardAuth, listAbandonedCarts);
router.get('/queue', dashboardAuth, getQueueStats);

module.exports = router;
