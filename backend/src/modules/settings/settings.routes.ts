import { Router, type Request, type Response, type NextFunction } from 'express';
import { param, body } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { notFound, validationError } from '../../shared/errors.js';

const router = Router();
const prisma = new PrismaClient();

/* ---- Currencies ---- */
router.get('/currencies', async (_req: Request, res: Response): Promise<void> => {
  const items = await prisma.currency.findMany({ orderBy: { code: 'asc' } });
  res.json({ items });
});

/* ---- Territories ---- */
router.get('/territories', async (_req: Request, res: Response): Promise<void> => {
  const items = await prisma.territory.findMany({
    include: { currency: true },
    orderBy: { name: 'asc' },
  });
  res.json({ items });
});

/* ---- Sources ---- */
router.get('/sources', async (_req: Request, res: Response): Promise<void> => {
  const items = await prisma.source.findMany({ orderBy: { code: 'asc' } });
  res.json({ items });
});

/* ---- Campaigns ---- */
router.get('/campaigns', async (_req: Request, res: Response): Promise<void> => {
  const items = await prisma.campaign.findMany({
    include: { source: true },
    orderBy: { name: 'asc' },
  });
  res.json({ items });
});

/* ---- Pipelines ---- */
router.get('/pipelines', async (_req: Request, res: Response): Promise<void> => {
  const items = await prisma.pipeline.findMany({
    include: { stages: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { code: 'asc' },
  });
  res.json({ items });
});

router.get(
  '/pipelines/:id/stages',
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const pipeline = await prisma.pipeline.findUnique({ where: { id: req.params.id } });
    if (!pipeline) { next(notFound('Pipeline not found')); return; }
    const items = await prisma.pipelineStage.findMany({
      where: { pipelineId: req.params.id },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ items });
  }
);

/* ---- Sales Reps ---- */
router.get('/sales-reps', async (_req: Request, res: Response): Promise<void> => {
  const items = await prisma.salesRep.findMany({
    include: { territory: true },
    orderBy: { name: 'asc' },
  });
  res.json({ items });
});

/* ---- Partners ---- */
router.get('/partners', async (_req: Request, res: Response): Promise<void> => {
  const items = await prisma.partner.findMany({
    include: { territory: true },
    orderBy: { name: 'asc' },
  });
  res.json({ items });
});

router.post(
  '/partners',
  body('name').isString().notEmpty(),
  body('territory_id').isUUID(),
  body('commission_pct').optional().isDecimal(),
  body('type').optional().isString(),
  async (req: Request, res: Response): Promise<void> => {
    const partner = await prisma.partner.create({
      data: {
        name: req.body.name,
        territoryId: req.body.territory_id,
        commissionPct: req.body.commission_pct,
        type: req.body.type,
      },
      include: { territory: true },
    });
    res.status(201).json(partner);
  }
);

router.patch(
  '/partners/:id',
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const existing = await prisma.partner.findUnique({ where: { id: req.params.id } });
    if (!existing) { next(notFound('Partner not found')); return; }
    const data: Record<string, unknown> = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.territory_id !== undefined) data.territoryId = req.body.territory_id;
    if (req.body.commission_pct !== undefined) data.commissionPct = req.body.commission_pct;
    if (req.body.type !== undefined) data.type = req.body.type;
    const partner = await prisma.partner.update({
      where: { id: req.params.id },
      data,
      include: { territory: true },
    });
    res.json(partner);
  }
);

/* ---- Products ---- */
router.get('/products', async (_req: Request, res: Response): Promise<void> => {
  const items = await prisma.product.findMany({ orderBy: { name: 'asc' } });
  res.json({ items });
});

router.post(
  '/products',
  body('name').isString().notEmpty(),
  body('sku').optional().isString(),
  body('type').isIn(['one_time', 'subscription']),
  async (req: Request, res: Response): Promise<void> => {
    const product = await prisma.product.create({
      data: { name: req.body.name, sku: req.body.sku, type: req.body.type },
    });
    res.status(201).json(product);
  }
);

router.patch(
  '/products/:id',
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) { next(notFound('Product not found')); return; }
    const data: Record<string, unknown> = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.sku !== undefined) data.sku = req.body.sku;
    if (req.body.type !== undefined) data.type = req.body.type;
    const product = await prisma.product.update({ where: { id: req.params.id }, data });
    res.json(product);
  }
);

/* ---- Price Lists ---- */
router.get('/price-lists', async (_req: Request, res: Response): Promise<void> => {
  const items = await prisma.priceList.findMany({
    include: { territory: true, currency: true, items: { include: { product: true } } },
    orderBy: { validFrom: 'desc' },
  });
  res.json({ items });
});

router.post(
  '/price-lists',
  body('territory_id').isUUID(),
  body('currency_id').isUUID(),
  body('valid_from').isISO8601(),
  body('valid_to').optional().isISO8601(),
  async (req: Request, res: Response): Promise<void> => {
    const pl = await prisma.priceList.create({
      data: {
        territoryId: req.body.territory_id,
        currencyId: req.body.currency_id,
        validFrom: new Date(req.body.valid_from),
        validTo: req.body.valid_to ? new Date(req.body.valid_to) : undefined,
      },
      include: { territory: true, currency: true },
    });
    res.status(201).json(pl);
  }
);

router.patch(
  '/price-lists/:id',
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const existing = await prisma.priceList.findUnique({ where: { id: req.params.id } });
    if (!existing) { next(notFound('Price list not found')); return; }
    const data: Record<string, unknown> = {};
    if (req.body.valid_from !== undefined) data.validFrom = new Date(req.body.valid_from);
    if (req.body.valid_to !== undefined) data.validTo = req.body.valid_to ? new Date(req.body.valid_to) : null;
    const pl = await prisma.priceList.update({
      where: { id: req.params.id },
      data,
      include: { territory: true, currency: true },
    });
    res.json(pl);
  }
);

/* ---- Commission Plans ---- */
router.get('/commission-plans', async (_req: Request, res: Response): Promise<void> => {
  const items = await prisma.commissionPlan.findMany({
    include: { rules: { include: { territory: true } } },
    orderBy: { name: 'asc' },
  });
  res.json({ items });
});

router.post(
  '/commission-plans',
  body('name').isString().notEmpty(),
  body('type').isIn(['deal_pct', 'mrr_pct', 'tier']),
  body('valid_from').isISO8601(),
  body('valid_to').optional().isISO8601(),
  async (req: Request, res: Response): Promise<void> => {
    const plan = await prisma.commissionPlan.create({
      data: {
        name: req.body.name,
        type: req.body.type,
        validFrom: new Date(req.body.valid_from),
        validTo: req.body.valid_to ? new Date(req.body.valid_to) : undefined,
      },
      include: { rules: true },
    });
    res.status(201).json(plan);
  }
);

router.patch(
  '/commission-plans/:id',
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const existing = await prisma.commissionPlan.findUnique({ where: { id: req.params.id } });
    if (!existing) { next(notFound('Commission plan not found')); return; }
    const data: Record<string, unknown> = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.type !== undefined) data.type = req.body.type;
    if (req.body.valid_from !== undefined) data.validFrom = new Date(req.body.valid_from);
    if (req.body.valid_to !== undefined) data.validTo = req.body.valid_to ? new Date(req.body.valid_to) : null;
    const plan = await prisma.commissionPlan.update({
      where: { id: req.params.id },
      data,
      include: { rules: { include: { territory: true } } },
    });
    res.json(plan);
  }
);

/* ---- Roles ---- */
router.get('/roles', async (_req: Request, res: Response): Promise<void> => {
  const items = await prisma.role.findMany({ orderBy: { code: 'asc' } });
  res.json({ items });
});

export default router;