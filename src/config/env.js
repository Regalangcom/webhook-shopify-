require('dotenv').config();

const required = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  shopify: {
    webhookSecret: required('SHOPIFY_WEBHOOK_SECRET'),
  },

  fonte: {
    apiUrl: required('FONTE_API_URL'),
    apiToken: required('FONTE_API_TOKEN'),
    senderId: process.env.FONTE_SENDER_ID,
  },

  // Used only when switching to BullMQ queue (see /queues and /workers)
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  reminders: {
    // 30 minutes default — delay before sending WhatsApp reminder
    delay: parseInt(process.env.REMINDER_DELAY || '1800000', 10),
  },

  dashboard: {
    secret: process.env.DASHBOARD_SECRET || 'change-me',
  },
};
