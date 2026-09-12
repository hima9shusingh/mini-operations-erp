import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@mini-erp.local';
  const password = 'Admin@12345';
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'ADMIN',
    },
    create: {
      name: 'Admin User',
      email,
      passwordHash,
      role: 'ADMIN',
    },
  });

  const salesEmail = 'sales@mini-erp.local';
  const salesPassword = 'Sales@12345';
  const salesPasswordHash = await bcrypt.hash(salesPassword, 10);

  const sales = await prisma.user.upsert({
    where: { email: salesEmail },
    update: {
      passwordHash: salesPasswordHash,
      role: 'SALES',
    },
    create: {
      name: 'Sales User',
      email: salesEmail,
      passwordHash: salesPasswordHash,
      role: 'SALES',
    },
  });

  console.log(`Development user seeded/verified: ${admin.email}`);
  console.log(`Development user seeded/verified: ${sales.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
