const express = require('express');
const { shopifyWebhookValidator, rawBodyMiddleware } = require('../middleware/shopifyWebhookValidator');
const { handleCartCreate, handleOrderCreate } = require('../controllers/webhookController');

const router = express.Router();

// rawBodyMiddleware must come before shopifyWebhookValidator
// It reads and parses the body, preserving rawBody for HMAC check

router.post(
  '/cart-create',
  rawBodyMiddleware,
  shopifyWebhookValidator,
  handleCartCreate
);

router.post(
  '/order-create',
  rawBodyMiddleware,
  shopifyWebhookValidator,
  handleOrderCreate
);

module.exports = router;
