const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

async function upsertCart({ cartToken, email, phone, items }) {
  const cart = await prisma.cart.upsert({
    where: { id: cartToken },
    create: {
      id: cartToken,
      email,
      phone: phone || null,
      items,
      status: 'active',
    },
    update: {
      email,
      phone: phone || undefined,
      items,
      status: 'active',
    },
  });
  logger.info(`Cart upserted: ${cartToken} | email: ${email}`);
  return cart;
}

// Called when orders/create webhook fires — prevents reminder from being sent
async function markConverted(cartToken) {
  try {
    return await prisma.cart.update({
      where: { id: cartToken },
      data: { status: 'converted' },
    });
  } catch (err) {
    // Cart may not exist yet if order webhook arrives before /track-cart
    logger.warn(`Could not mark cart ${cartToken} as converted: ${err.message}`);
    return null;
  }
}

async function findActiveCart(cartToken) {
  return prisma.cart.findFirst({
    where: { id: cartToken, status: 'active' },
  });
}

async function markReminderSent(cartToken) {
  return prisma.cart.update({
    where: { id: cartToken },
    data: { reminderSent: true },
  });
}

async function getActiveCarts({ page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [carts, total] = await Promise.all([
    prisma.cart.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.cart.count({ where: { status: 'active' } }),
  ]);
  return { carts, total, page, limit };
}

module.exports = {
  upsertCart,
  markConverted,
  findActiveCart,
  markReminderSent,
  getActiveCarts,
};
