const axios = require("axios");
const config = require("../config/env");
const logger = require("../utils/logger");

const fonteClient = axios.create({
  baseURL: config.fonte.apiUrl,
  headers: {
    Authorization: config.fonte.apiToken,
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Normalizes to E.164-compatible format; assumes Indonesian numbers if no country code
function normalizePhone(phone) {
  let cleaned = phone.replace(/[\s\-().+]/g, "");
  if (cleaned.startsWith("08")) cleaned = "62" + cleaned.slice(1);
  else if (cleaned.startsWith("8") && cleaned.length <= 11)
    cleaned = "62" + cleaned;
  return cleaned;
}

async function sendWhatsApp(phone, message) {
  const to = normalizePhone(phone);
  logger.info(`Sending WhatsApp to ${to}`);

  const payload = {
    target: to,
    message: message,
    // ...(config.fonte.senderId ? { sender: config.fonte.senderId } : {}),
  };

  try {
    const response = await fonteClient.post("/send", payload);
    logger.info(`WhatsApp delivered to ${to}: ${JSON.stringify(response.data)}`);
    return response.data;
  } catch (err) {
    logger.error(`WhatsApp send failed for ${to}: ${err.response?.data || err.message}`);
    return null;
  }
}

module.exports = { sendWhatsApp, normalizePhone };
