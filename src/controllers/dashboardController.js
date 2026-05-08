const cartService = require('../services/cartService');
const logger = require('../utils/logger');

/**
 * GET /dashboard/carts?page=1&limit=20
 * Lists active (non-converted) carts.
 */
async function listActiveCarts(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const result = await cartService.getActiveCarts({ page, limit });
    res.json(result);
  } catch (err) {
    logger.error(`Dashboard error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /dashboard/health
 */
async function healthCheck(req, res) {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}

module.exports = { listActiveCarts, healthCheck };
