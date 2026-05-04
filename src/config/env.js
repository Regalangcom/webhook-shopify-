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
    shopDomain: required('SHOPIFY_SHOP_DOMAIN'),
    adminApiToken: required('SHOPIFY_ADMIN_API_TOKEN'),
    apiVersion: process.env.SHOPIFY_API_VERSION || '2024-01',
  },

  fonte: {
    apiUrl: required('FONTE_API_URL'),
    apiToken: required('FONTE_API_TOKEN'),
    senderId: process.env.FONTE_SENDER_ID,
  },

  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  reminders: {
    delay1: parseInt(process.env.REMINDER_DELAY_1 || '3600000', 10),   // 1 hour
    delay2: parseInt(process.env.REMINDER_DELAY_2 || '86400000', 10),  // 24 hours
  },

  dashboard: {
    secret: process.env.DASHBOARD_SECRET || 'change-me',
  },
};
