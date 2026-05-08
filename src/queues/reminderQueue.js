/**
 * BullMQ Reminder Queue — future upgrade from setTimeout
 *
 * Currently NOT imported at startup. The active reminder system lives in
 * reminder.service.js and uses setTimeout.
 *
 * To activate:
 *   1. Ensure Redis is running
 *   2. Set REDIS_HOST / REDIS_PORT / REDIS_PASSWORD in .env
 *   3. In reminder.service.js: uncomment the scheduleReminderJob import and call,
 *      then remove the setTimeout line
 *   4. In server.js: import and call startWorker() from /workers/reminderWorker.js
 */

const { Queue } = require('bullmq');
const config = require('../config/env');

const connection = {
  host: config.redis.host,
  port: config.redis.port,
  ...(config.redis.password ? { password: config.redis.password } : {}),
};

let _queue = null;

function getQueue() {
  if (!_queue) {
    _queue = new Queue('reminder-queue', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 60000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return _queue;
}

async function scheduleReminderJob(cartToken, delayMs) {
  const job = await getQueue().add(
    'send-reminder',
    { cartToken },
    { delay: delayMs }
  );
  return job.id;
}

module.exports = { getQueue, scheduleReminderJob };
