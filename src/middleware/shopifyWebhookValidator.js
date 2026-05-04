const crypto = require('crypto');
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * Validates Shopify webhook HMAC signature.
 * Must be registered BEFORE express.json() so the raw body is preserved.
 */
function shopifyWebhookValidator(req, res, next) {
  const hmacHeader = req.get('X-Shopify-Hmac-Sha256');

  if (!hmacHeader) {
    logger.warn('Webhook rejected: missing HMAC header');
    return res.status(401).json({ error: 'Missing HMAC signature' });
  }

  // rawBody is attached by the rawBodyMiddleware below
  const rawBody = req.rawBody;
  if (!rawBody) {
    logger.error('Webhook rejected: raw body unavailable');
    return res.status(500).json({ error: 'Internal error validating webhook' });
  }

  const digest = crypto
    .createHmac('sha256', config.shopify.webhookSecret)
    .update(rawBody, 'utf8')
    .digest('base64');

  const trusted = Buffer.from(digest);
  const received = Buffer.from(hmacHeader);

  if (trusted.length !== received.length || !crypto.timingSafeEqual(trusted, received)) {
    logger.warn('Webhook rejected: invalid HMAC signature');
    return res.status(401).json({ error: 'Invalid HMAC signature' });
  }

  next();
}

/**
 * Captures raw body before JSON parsing so HMAC validation works.
 * Use this instead of express.json() on webhook routes.
 */
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

module.exports = { shopifyWebhookValidator, rawBodyMiddleware };
