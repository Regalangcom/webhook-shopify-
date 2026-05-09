const customerService = require('../services/customerService');
const cartService = require('../services/cartService');
const reminderService = require('../services/reminder.service');
const logger = require('../utils/logger');

/**
 * POST /track-cart
 *
 * Called by the Shopify storefront (Shopify Ajax API) when a user adds to cart.
 * Body: { cart_token, items, email }
 *
 * Flow:
 *  1. Look up phone by email from the Customer table
 *  2. Upsert Cart with cart_token as primary key
 *  3. Schedule a 30-minute reminder (skipped if no phone)
 */
async function handleTrackCart(req, res) {
  try {
    const { cart_token, items, email } = req.body;

    if (!cart_token || !items || !email) {
      return res.status(400).json({ error: 'cart_token, items, and email are required' });
    }

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items must be an array' });
    }

    // Lookup phone — only available if the customer has placed an order before
    const customer = await customerService.findByEmail(email);
    const phone = customer?.phone || null;

    if (!phone) {
      logger.warn(`No phone found for ${email} — reminder will be skipped when it fires`);
    }

    const cart = await cartService.upsertCart({ cartToken: cart_token, email, phone, items });

    // Schedule reminder; it will re-check cart status at fire time
    reminderService.scheduleReminder(cart_token);

    res.status(200).json({ success: true, cartId: cart.id });
  } catch (err) {
    logger.error(`Error tracking cart: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { handleTrackCart };
