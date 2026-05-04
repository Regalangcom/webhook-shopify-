const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Extracts a phone number from cart attributes or note_attributes.
 * Shopify carts can carry arbitrary key/value pairs set by the storefront.
 */
function extractPhone(payload) {
  const attrs = [
    ...(payload.attributes || []),
    ...(payload.note_attributes || []),
  ];
  const phoneAttr = attrs.find((a) =>
    ['phone', 'customer_phone', 'whatsapp', 'mobile'].includes(
      (a.name || '').toLowerCase()
    )
  );
  return phoneAttr?.value || null;
}

function extractCheckoutUrl(payload) {
  if (payload.abandoned_checkout_url) return payload.abandoned_checkout_url;
  if (payload.token && process.env.SHOPIFY_SHOP_DOMAIN) {
    return `https://${process.env.SHOPIFY_SHOP_DOMAIN}/checkouts/${payload.token}`;
  }
  return null;
}

async function upsertCart(payload) {
  const cartToken = payload.token;
  if (!cartToken) throw new Error('Cart payload missing token');

  const data = {
    cartToken,
    products: payload.line_items || [],
    checkoutUrl: extractCheckoutUrl(payload),
    totalPrice: payload.total_price?.toString() || null,
    currency: payload.currency || null,
    customerPhone: extractPhone(payload),
    customerEmail: payload.email || null,
    customerName: payload.customer
      ? `${payload.customer.first_name || ''} ${payload.customer.last_name || ''}`.trim()
      : null,
    status: 'ACTIVE',
  };

  const cart = await prisma.abandonedCart.upsert({
    where: { cartToken },
    create: data,
    update: {
      products: data.products,
      checkoutUrl: data.checkoutUrl,
      totalPrice: data.totalPrice,
      customerPhone: data.customerPhone || undefined,
      customerEmail: data.customerEmail || undefined,
      customerName: data.customerName || undefined,
      status: 'ACTIVE',
      updatedAt: new Date(),
    },
  });

  logger.info(`Cart upserted: ${cartToken} | status: ${cart.status}`);
  return cart;
}

async function markConverted(cartToken) {
  return prisma.abandonedCart.update({
    where: { cartToken },
    data: { status: 'CONVERTED' },
  });
}

async function markAbandoned(cartId) {
  return prisma.abandonedCart.update({
    where: { id: cartId },
    data: { status: 'ABANDONED' },
  });
}

async function incrementReminderCount(cartId) {
  return prisma.abandonedCart.update({
    where: { id: cartId },
    data: {
      reminderSent: true,
      remindersCount: { increment: 1 },
    },
  });
}

async function findActiveCart(cartId) {
  return prisma.abandonedCart.findFirst({
    where: { id: cartId, status: 'ACTIVE' },
  });
}

async function findByToken(cartToken) {
  return prisma.abandonedCart.findUnique({ where: { cartToken } });
}

async function createReminderRecord({ cartId, jobId, stage, scheduledAt }) {
  return prisma.cartReminder.create({
    data: { cartId, jobId, stage, scheduledAt },
  });
}

async function updateReminderStatus(id, status, error = null) {
  return prisma.cartReminder.update({
    where: { id },
    data: { status, error, sentAt: status === 'SENT' ? new Date() : undefined },
  });
}

async function getAbandonedCarts({ page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [carts, total] = await Promise.all([
    prisma.abandonedCart.findMany({
      where: { status: { in: ['ACTIVE', 'ABANDONED'] } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { reminders: true },
    }),
    prisma.abandonedCart.count({
      where: { status: { in: ['ACTIVE', 'ABANDONED'] } },
    }),
  ]);
  return { carts, total, page, limit };
}

module.exports = {
  upsertCart,
  markConverted,
  markAbandoned,
  markReminderSent: incrementReminderCount,
  findActiveCart,
  findByToken,
  createReminderRecord,
  updateReminderStatus,
  getAbandonedCarts,
};
