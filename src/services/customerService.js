const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

async function upsertCustomer({ email, phone }) {
  const customer = await prisma.customer.upsert({
    where: { email },
    create: { email, phone },
    update: { phone },
  });
  logger.info(`Customer upserted: ${email}`);
  return customer;
}

async function findByEmail(email) {
  return prisma.customer.findUnique({ where: { email } });
}

module.exports = { upsertCustomer, findByEmail };
