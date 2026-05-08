require("./src/config/env");
const express = require("express");
const rateLimit = require("express-rate-limit");
const logger = require("./src/utils/logger");
const config = require("./src/config/env");

const webhookRoutes = require("./src/routes/webhook");
const cartRoutes = require("./src/routes/cart");
const dashboardRoutes = require("./src/routes/dashboard");

const app = express();
app.set("trust proxy", 1);

// Rate limiter for Shopify webhook endpoint
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});

// Webhook routes use rawBodyMiddleware internally — do NOT add express.json() before them
app.use("/webhook", webhookLimiter, webhookRoutes);

// Standard JSON body parsing for all non-webhook routes
app.use(express.json());
app.use("/track-cart", cartRoutes);
app.use("/dashboard", dashboardRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: "Internal server error" });
});

app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port} [${config.nodeEnv}]`);
  logger.info(`Webhook:    POST /webhook/orders-create`);
  logger.info(`Track cart: POST /track-cart`);
  logger.info(`Dashboard:  GET  /dashboard/carts`);
  logger.info(`Health:     GET  /dashboard/health`);
});
