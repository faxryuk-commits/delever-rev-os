import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const roleAdmin = await prisma.role.upsert({
    where: { code: 'admin' },
    update: {},
    create: { code: 'admin', name: 'Administrator' },
  });
  const roleSales = await prisma.role.upsert({
    where: { code: 'sales' },
    update: {},
    create: { code: 'sales', name: 'Sales' },
  });

  const usd = await prisma.currency.upsert({
    where: { code: 'USD' },
    update: {},
    create: { code: 'USD', name: 'US Dollar', symbol: '$' },
  });
  const eur = await prisma.currency.upsert({
    where: { code: 'EUR' },
    update: {},
    create: { code: 'EUR', name: 'Euro', symbol: '€' },
  });

  const territoryDefault = await prisma.territory.upsert({
    where: { code: 'DEFAULT' },
    update: {},
    create: {
      code: 'DEFAULT',
      name: 'Default',
      timezone: 'UTC',
      currencyId: usd.id,
    },
  });

  const hash = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@delever.io' },
    update: {},
    create: {
      email: 'admin@delever.io',
      passwordHash: hash,
      name: 'Admin',
      roleId: roleAdmin.id,
      territoryId: territoryDefault.id,
    },
  });

  const salesRep = await prisma.salesRep.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      territoryId: territoryDefault.id,
      name: user.name ?? 'Admin',
      email: user.email,
    },
  });

  const sourceWeb = await prisma.source.upsert({
    where: { code: 'website' },
    update: {},
    create: { code: 'website', name: 'Website', channel: 'web' },
  });

  await prisma.campaign.upsert({
    where: { id: 'seed-campaign-1' },
    update: {},
    create: {
      id: 'seed-campaign-1',
      sourceId: sourceWeb.id,
      name: 'Default Campaign',
      cost: 0,
    },
  });

  const pipelineNb = await prisma.pipeline.upsert({
    where: { code: 'new_business' },
    update: {},
    create: { code: 'new_business', name: 'New Business' },
  });

  const stages = [
    { name: 'Lead captured', sortOrder: 1, probabilityPct: 5, isWon: false, isLost: false },
    { name: 'Qualification', sortOrder: 2, probabilityPct: 10, isWon: false, isLost: false },
    { name: 'Discovery', sortOrder: 3, probabilityPct: 20, isWon: false, isLost: false },
    { name: 'Demo', sortOrder: 4, probabilityPct: 40, isWon: false, isLost: false },
    { name: 'Proposal', sortOrder: 5, probabilityPct: 60, isWon: false, isLost: false },
    { name: 'Negotiation', sortOrder: 6, probabilityPct: 80, isWon: false, isLost: false },
    { name: 'Won', sortOrder: 7, probabilityPct: 100, isWon: true, isLost: false },
    { name: 'Lost', sortOrder: 8, probabilityPct: 0, isWon: false, isLost: true },
  ];
  for (const s of stages) {
    const exists = await prisma.pipelineStage.findFirst({
      where: { pipelineId: pipelineNb.id, sortOrder: s.sortOrder },
    });
    if (!exists) {
      await prisma.pipelineStage.create({
        data: {
          pipelineId: pipelineNb.id,
          name: s.name,
          sortOrder: s.sortOrder,
          probabilityPct: s.probabilityPct,
          isWon: s.isWon,
          isLost: s.isLost,
        },
      });
    }
  }

  console.log('Seed done: roles, user admin@delever.io / admin123, territory, pipeline new_business');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
