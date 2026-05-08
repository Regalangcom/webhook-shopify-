const cartService = require('./cartService');
const { sendWhatsApp } = require('./whatsapp.service');
const config = require('../config/env');
const logger = require('../utils/logger');

// To switch to BullMQ: uncomment the line below, comment out the setTimeout call in scheduleReminder,
// and uncomment the scheduleReminderJob call. See /queues/reminderQueue.js and /workers/reminderWorker.js.
// const { scheduleReminderJob } = require('../queues/reminderQueue');

function buildMessage(cart) {
  const items = Array.isArray(cart.items) ? cart.items : [];
  const list = items
    .slice(0, 3)
    .map((p) => `• ${p.title || p.name || 'Item'} (x${p.quantity || 1})`)
    .join('\n');
  const more = items.length > 3 ? `\n...and ${items.length - 3} more item(s)` : '';

  return (
    `Hi! 👋 You left some items in your cart:\n\n` +
    `${list}${more}\n\n` +
    `Complete your purchase before it's gone! 🛒`
  );
}

async function sendReminderIfActive(cartToken) {
  try {
    const cart = await cartService.findActiveCart(cartToken);

    if (!cart) {
      logger.info(`Cart ${cartToken} no longer active — reminder skipped`);
      return;
    }

    if (cart.reminderSent) {
      logger.info(`Reminder already sent for cart ${cartToken} — skipped`);
      return;
    }

    if (!cart.phone) {
      logger.warn(`Cart ${cartToken} has no phone number — reminder skipped`);
      return;
    }

    await sendWhatsApp(cart.phone, buildMessage(cart));
    await cartService.markReminderSent(cartToken);

    logger.info(`Reminder sent for cart ${cartToken}`);
  } catch (err) {
    logger.error(`Reminder failed for cart ${cartToken}: ${err.message}`);
  }
}

function scheduleReminder(cartToken) {
  const delay = config.reminders.delay;
  logger.info(`Reminder scheduled for cart ${cartToken} in ${delay / 1000}s`);

  // CURRENT: setTimeout-based scheduling
  setTimeout(() => sendReminderIfActive(cartToken), delay);

  // FUTURE (BullMQ): replace the line above with this when switching:
  // scheduleReminderJob(cartToken, delay);
}

module.exports = { scheduleReminder };
