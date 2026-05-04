require('./src/config/env'); // validates required env vars early
const express = require('express');
const rateLimit = require('express-rate-limit');
const logger = require('./src/utils/logger');
const config = require('./src/config/env');

const webhookRoutes = require('./src/routes/webhook');
const dashboardRoutes = require('./src/routes/dashboard');
const schedulerService = require('./src/services/schedulerService');

const app = express();

// Rate limiting for webhook endpoint — Shopify sends bursts but not huge volumes
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

// Webhook routes use rawBodyMiddleware internally (no express.json here)
app.use('/webhook', webhookLimiter, webhookRoutes);

// Dashboard uses standard JSON parsing
app.use(express.json());
app.use('/dashboard', dashboardRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  // Start the Bull queue worker
  schedulerService.startWorker();

  app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} [${config.nodeEnv}]`);
    logger.info(`Webhook endpoint: POST /webhook/cart-create`);
    logger.info(`Dashboard:        GET  /dashboard/carts`);
  });
}

start().catch((err) => {
  logger.error(`Failed to start server: ${err.message}`);
  process.exit(1);
});
