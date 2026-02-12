import { Router, type Request, type Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/currencies', async (_req: Request, res: Response): Promise<void> => {
  const items = await prisma.currency.findMany({ orderBy: { code: 'asc' } });
  res.json({ items });
});

router.get('/territories', async (_req: Request, res: Response): Promise<void> => {
  const items = await prisma.territory.findMany({
    include: { currency: true },
    orderBy: { name: 'asc' },
  });
  res.json({ items });
});

router.get('/sources', async (_req: Request, res: Response): Promise<void> => {
  const items = await prisma.source.findMany({ orderBy: { code: 'asc' } });
  res.json({ items });
});

router.get('/campaigns', async (_req: Request, res: Response): Promise<void> => {
  const items = await prisma.campaign.findMany({
    include: { source: true },
    orderBy: { name: 'asc' },
  });
  res.json({ items });
});

router.get('/pipelines', async (_req: Request, res: Response): Promise<void> => {
  const items = await prisma.pipeline.findMany({
    include: { stages: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { code: 'asc' },
  });
  res.json({ items });
});

router.get('/sales-reps', async (_req: Request, res: Response): Promise<void> => {
  const items = await prisma.salesRep.findMany({
    include: { territory: true },
    orderBy: { name: 'asc' },
  });
  res.json({ items });
});

export default router;