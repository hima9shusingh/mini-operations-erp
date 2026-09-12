import prisma from '../database/prisma';

beforeAll(async () => {
  await prisma.customerOrder.deleteMany();
  await prisma.internalTransfer.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.location.deleteMany();
  await prisma.item.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
