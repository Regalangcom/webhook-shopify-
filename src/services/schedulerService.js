const reminderQueue = require('../queues/reminderQueue');
const cartService = require('./cartService');
const orderService = require('./orderService');
const whatsappService = require('./whatsappService');
const config = require('../config/env');
const logger = require('../utils/logger');

const STAGES = [
  { stage: 1, delay: config.reminders.delay1 },
  { stage: 2, delay: config.reminders.delay2 },
];

/**
 * Schedules both reminder jobs for a cart when the webhook is received.
 */
async function scheduleReminders(cart) {
  for (const { stage, delay } of STAGES) {
    const job = await reminderQueue.add(
      { cartId: cart.id, cartToken: cart.cartToken, stage },
      { delay }
    );

    const scheduledAt = new Date(Date.now() + delay);
    await cartService.createReminderRecord({
      cartId: cart.id,
      jobId: String(job.id),
      stage,
      scheduledAt,
    });

    logger.info(`Scheduled reminder stage ${stage} for cart ${cart.id} at ${scheduledAt.toISOString()}`);
  }
}

/**
 * Processes a reminder job: checks conversion, sends WA if still active.
 */
async function processReminderJob(job) {
  const { cartId, cartToken, stage } = job.data;
  logger.info(`Processing reminder job | cart: ${cartId} | stage: ${stage}`);

  // Re-fetch cart to get latest status
  const cart = await cartService.findActiveCart(cartId);
  if (!cart) {
    logger.info(`Cart ${cartId} no longer active — skipping reminder`);
    return { skipped: true, reason: 'cart_not_active' };
  }

  // Check Shopify to confirm the cart was not converted to an order
  const converted = await orderService.syncCartConversionStatus(cartToken);
  if (converted) {
    logger.info(`Cart ${cartId} was converted — skipping reminder`);
    return { skipped: true, reason: 'cart_converted' };
  }

  // No phone number = cannot send
  if (!cart.customerPhone) {
    logger.warn(`Cart ${cartId} has no phone number — cannot send reminder`);
    return { skipped: true, reason: 'no_phone' };
  }

  await whatsappService.sendWhatsAppReminder(cart, stage);
  await cartService.markReminderSent(cartId);

  // After stage 2, mark officially abandoned
  if (stage === 2) {
    await cartService.markAbandoned(cartId);
  }

  return { sent: true, stage };
}

/**
 * Registers the worker that processes jobs from the queue.
 * Call this once at startup.
 */
function startWorker() {
  reminderQueue.process(async (job) => {
    return processReminderJob(job);
  });

  logger.info('Reminder queue worker started');
}

module.exports = { scheduleReminders, startWorker };
