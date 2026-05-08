const express = require('express');
const { listActiveCarts, healthCheck } = require('../controllers/dashboardController');
const config = require('../config/env');

const router = express.Router();

function dashboardAuth(req, res, next) {
  const token = req.headers['x-dashboard-secret'] || req.query.secret;
  if (token !== config.dashboard.secret) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

router.get('/health', healthCheck);
router.get('/carts', dashboardAuth, listActiveCarts);

module.exports = router;
