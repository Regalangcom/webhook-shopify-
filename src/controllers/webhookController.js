const customerService = require('../services/customerService');
const cartService = require('../services/cartService');
const logger = require('../utils/logger');

function extractPhone(payload) {
  return (
    payload.customer?.phone ||
    payload.billing_address?.phone ||
    payload.shipping_address?.phone ||
    payload.phone ||
    null
  );
}

/**
 * POST /webhook/orders-create
 *
 * 1. Extract email + phone → upsert Customer (phone lookup source for future carts)
 * 2. If cart_token present → mark Cart as converted (suppresses any pending reminder)
 */
async function handleOrderCreate(req, res) {
  // Respond immediately — Shopify retries if we take > 5s
  res.status(200).json({ received: true });

  try {
    const payload = req.body;
    const email = payload.email || payload.customer?.email;
    const phone = extractPhone(payload);
    const cartToken = payload.cart_token;

    if (email && phone) {
      await customerService.upsertCustomer({ email, phone });
      logger.info(`Customer stored from order: ${email}`);
    } else {
      logger.warn(`Order webhook missing email or phone — email:${email} phone:${phone}`);
    }

    if (cartToken) {
      await cartService.markConverted(cartToken);
      logger.info(`Cart ${cartToken} marked as converted`);
    } else {
      logger.debug('Order webhook had no cart_token — skipping cart update');
    }
  } catch (err) {
    logger.error(`Error processing order webhook: ${err.message}`, { stack: err.stack });
  }
}

module.exports = { handleOrderCreate };
