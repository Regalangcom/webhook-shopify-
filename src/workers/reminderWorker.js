/**
 * BullMQ Reminder Worker — future upgrade from setTimeout
 *
 * Currently NOT started. See /queues/reminderQueue.js for activation instructions.
 *
 * When active, this worker:
 *  1. Picks up delayed jobs from the 'reminder-queue'
 *  2. Re-checks that the cart is still active and unsent
 *  3. Sends WhatsApp via Fonte and marks reminderSent = true
 */

const { Worker } = require('bullmq');
const cartService = require('../services/cartService');
const { sendWhatsApp } = require('../services/whatsapp.service');
const config = require('../config/env');
const logger = require('../utils/logger');

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

function startWorker() {
  const connection = {
    host: config.redis.host,
    port: config.redis.port,
    ...(config.redis.password ? { password: config.redis.password } : {}),
  };

  const worker = new Worker(
    'reminder-queue',
    async (job) => {
      const { cartToken } = job.data;
      logger.info(`Processing reminder job ${job.id} for cart ${cartToken}`);

      const cart = await cartService.findActiveCart(cartToken);

      if (!cart) {
        logger.info(`Cart ${cartToken} no longer active — skipped`);
        return { skipped: true, reason: 'cart_not_active' };
      }

      if (cart.reminderSent) {
        logger.info(`Reminder already sent for cart ${cartToken} — skipped`);
        return { skipped: true, reason: 'already_sent' };
      }

      if (!cart.phone) {
        logger.warn(`Cart ${cartToken} has no phone — skipped`);
        return { skipped: true, reason: 'no_phone' };
      }

      await sendWhatsApp(cart.phone, buildMessage(cart));
      await cartService.markReminderSent(cartToken);
      logger.info(`Reminder sent for cart ${cartToken}`);

      return { sent: true };
    },
    { connection }
  );

  worker.on('failed', (job, err) => {
    logger.error(`Reminder job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`);
  });

  worker.on('completed', (job) => {
    logger.info(`Reminder job ${job.id} completed`);
  });

  logger.info('BullMQ reminder worker started');
  return worker;
}

module.exports = { startWorker };
