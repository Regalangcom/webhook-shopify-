const Bull = require('bull');
const config = require('../config/env');
const logger = require('../utils/logger');

const redisOptions = {
  host: config.redis.host,
  port: config.redis.port,
  ...(config.redis.password ? { password: config.redis.password } : {}),
};

const reminderQueue = new Bull('cart-reminders', {
  redis: redisOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000, // 1 min initial backoff, then 2m, 4m
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

reminderQueue.on('error', (err) => {
  logger.error(`Queue error: ${err.message}`);
});

reminderQueue.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed (attempt ${job.attemptsMade}): ${err.message}`);
});

reminderQueue.on('completed', (job) => {
  logger.info(`Job ${job.id} completed | cart: ${job.data.cartId} | stage: ${job.data.stage}`);
});

module.exports = reminderQueue;
