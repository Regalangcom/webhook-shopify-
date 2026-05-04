const axios = require('axios');
const config = require('../config/env');
const logger = require('../utils/logger');

const shopifyClient = axios.create({
  baseURL: `https://${config.shopify.shopDomain}/admin/api/${config.shopify.apiVersion}`,
  headers: {
    'X-Shopify-Access-Token': config.shopify.adminApiToken,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * Checks Shopify Admin API to see if a cart token was converted to an order.
 * Returns true if an order exists for this cart token.
 */
async function isCartConverted(cartToken) {
  try {
    // Shopify stores cart_token on checkout, then propagates to order
    const response = await shopifyClient.get('/orders.json', {
      params: {
        cart_token: cartToken,
        status: 'any',
        fields: 'id,cart_token,financial_status',
        limit: 1,
      },
    });

    const orders = response.data?.orders || [];
    const converted = orders.length > 0;
    logger.debug(`Cart ${cartToken} converted: ${converted}`);
    return converted;
  } catch (err) {
    // If Shopify API is down, default to NOT sending reminder (safe fail)
    logger.error(`Shopify order check failed for cart ${cartToken}: ${err.message}`);
    throw new Error(`Order check failed: ${err.message}`);
  }
}

/**
 * Marks a cart as converted in our DB by cross-referencing Shopify orders.
 * Returns the updated cart or null if not converted.
 */
async function syncCartConversionStatus(cartToken) {
  const converted = await isCartConverted(cartToken);
  if (converted) {
    const cartService = require('./cartService');
    await cartService.markConverted(cartToken);
  }
  return converted;
}

module.exports = { isCartConverted, syncCartConversionStatus };
