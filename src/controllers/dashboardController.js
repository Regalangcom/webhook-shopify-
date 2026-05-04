const cartService = require('../services/cartService');
const reminderQueue = require('../queues/reminderQueue');
const logger = require('../utils/logger');

/**
 * GET /dashboard/carts?page=1&limit=20
 * Lists abandoned/active carts.
 */
async function listAbandonedCarts(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));

    const result = await cartService.getAbandonedCarts({ page, limit });
    res.json(result);
  } catch (err) {
    logger.error(`Dashboard error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /dashboard/queue
 * Returns Bull queue stats.
 */
async function getQueueStats(req, res) {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      reminderQueue.getWaitingCount(),
      reminderQueue.getActiveCount(),
      reminderQueue.getCompletedCount(),
      reminderQueue.getFailedCount(),
      reminderQueue.getDelayedCount(),
    ]);

    res.json({ waiting, active, completed, failed, delayed });
  } catch (err) {
    logger.error(`Queue stats error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /dashboard/health
 * Simple health check.
 */
async function healthCheck(req, res) {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}

module.exports = { listAbandonedCarts, getQueueStats, healthCheck };
