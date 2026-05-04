const cartService = require('../services/cartService');
const schedulerService = require('../services/schedulerService');
const logger = require('../utils/logger');

/**
 * POST /webhook/cart-create
 * Handles Shopify cart/create webhook. Stores cart and schedules reminders.
 */
async function handleCartCreate(req, res) {
  // Respond 200 fast — Shopify expects < 5s or it will retry
  res.status(200).json({ received: true });

  try {
    const payload = req.body;
    logger.info(`Cart webhook received: token=${payload.token}`);

    const cart = await cartService.upsertCart(payload);
    await schedulerService.scheduleReminders(cart);

    logger.info(`Reminders scheduled for cart ${cart.id}`);
  } catch (err) {
    // Log but don't re-throw — response is already sent
    logger.error(`Error processing cart webhook: ${err.message}`, { stack: err.stack });
  }
}

/**
 * POST /webhook/order-create
 * Handles Shopify order/create webhook. Marks matching cart as converted
 * so pending reminders are skipped.
 */
async function handleOrderCreate(req, res) {
  res.status(200).json({ received: true });

  try {
    const payload = req.body;
    const cartToken = payload.cart_token;

    if (!cartToken) {
      logger.debug('Order webhook received without cart_token — ignoring');
      return;
    }

    logger.info(`Order created for cart token: ${cartToken}`);
    await cartService.markConverted(cartToken);
  } catch (err) {
    logger.error(`Error processing order webhook: ${err.message}`);
  }
}

module.exports = { handleCartCreate, handleOrderCreate };
