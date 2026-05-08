const express = require('express');
const { rawBodyMiddleware, verifyShopifyWebhook } = require('../utils/shopifyWebhookVerifier');
const { handleOrderCreate } = require('../controllers/webhookController');

const router = express.Router();

router.post(
  '/orders-create',
  rawBodyMiddleware,
  verifyShopifyWebhook,
  handleOrderCreate
);

module.exports = router;
