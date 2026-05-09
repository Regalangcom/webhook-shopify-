const crypto = require('crypto');
const config = require('../config/env');
const logger = require('./logger');

// Reads raw body before JSON parsing so HMAC validation works correctly.
// Must be placed before verifyShopifyWebhook on any webhook route.
function rawBodyMiddleware(req, res, next) {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => { data += chunk; });
  req.on('end', () => {
    req.rawBody = data;
    try {
      req.body = JSON.parse(data);
    } catch {
      req.body = {};
    }
    next();
  });
}

// Verifies Shopify HMAC-SHA256 signature from X-Shopify-Hmac-Sha256 header.
function verifyShopifyWebhook(req, res, next) {
  const hmacHeader = req.get('X-Shopify-Hmac-Sha256');

  if (!hmacHeader) {
    logger.warn('Webhook rejected: missing HMAC header');
    return res.status(401).json({ error: 'Missing HMAC signature' });
  }

  if (!req.rawBody) {
    logger.error('Webhook rejected: raw body unavailable');
    return res.status(500).json({ error: 'Internal error validating webhook' });
  }

  const digest = crypto
    .createHmac('sha256', config.shopify.webhookSecret)
    .update(req.rawBody, 'utf8')
    .digest('base64');

  const trusted = Buffer.from(digest);
  const received = Buffer.from(hmacHeader);

  if (trusted.length !== received.length || !crypto.timingSafeEqual(trusted, received)) {
    logger.warn('Webhook rejected: invalid HMAC signature');
    return res.status(401).json({ error: 'Invalid HMAC signature' });
  }

  next();
}

module.exports = { rawBodyMiddleware, verifyShopifyWebhook };
