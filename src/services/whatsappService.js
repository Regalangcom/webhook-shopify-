const axios = require('axios');
const config = require('../config/env');
const logger = require('../utils/logger');

const fonteClient = axios.create({
  baseURL: config.fonte.apiUrl,
  headers: {
    Authorization: `Bearer ${config.fonte.apiToken}`,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

/**
 * Normalizes phone number to E.164 format (no spaces, no dashes).
 * Assumes Indonesian numbers if no country code (adds +62).
 */
function normalizePhone(phone) {
  let cleaned = phone.replace(/[\s\-().+]/g, '');
  if (cleaned.startsWith('08')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8') && cleaned.length <= 11) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

function buildMessage(cart, stage = 1) {
  const productList = (cart.products || [])
    .slice(0, 3)
    .map((p) => `• ${p.title || p.name} (x${p.quantity})`)
    .join('\n');

  const more =
    cart.products.length > 3 ? `\n...and ${cart.products.length - 3} more item(s)` : '';

  const greeting = cart.customerName ? `Hi ${cart.customerName}! 👋` : 'Hi there! 👋';

  if (stage === 1) {
    return (
      `${greeting}\n\n` +
      `You left some items in your cart:\n${productList}${more}\n\n` +
      `Complete your purchase here:\n${cart.checkoutUrl || 'your store'}\n\n` +
      `Don't miss out — your cart is waiting for you! 🛒`
    );
  }

  // Stage 2 (24h) — last chance tone
  return (
    `${greeting}\n\n` +
    `Your cart is about to expire! ⏳\n\n` +
    `Items reserved for you:\n${productList}${more}\n\n` +
    `Secure your order now:\n${cart.checkoutUrl || 'your store'}`
  );
}

/**
 * Sends a WhatsApp message via the Fonte API.
 * Throws on failure so the Bull queue can retry.
 */
async function sendWhatsAppReminder(cart, stage = 1) {
  if (!cart.customerPhone) {
    throw new Error(`No phone number for cart ${cart.id}`);
  }

  const to = normalizePhone(cart.customerPhone);
  const message = buildMessage(cart, stage);

  logger.info(`Sending WhatsApp reminder (stage ${stage}) to ${to} for cart ${cart.id}`);

  const payload = {
    to,
    message,
    ...(config.fonte.senderId ? { sender: config.fonte.senderId } : {}),
  };

  const response = await fonteClient.post('/send', payload);

  logger.info(`WhatsApp sent | cart: ${cart.id} | response: ${JSON.stringify(response.data)}`);
  return response.data;
}

module.exports = { sendWhatsAppReminder, normalizePhone, buildMessage };
