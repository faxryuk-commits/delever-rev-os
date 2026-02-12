import { Router, type Request, type Response, type NextFunction } from 'express';
import { query, body, param } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { notFound, validationError } from '../../shared/errors.js';
import { emit } from '../../shared/events.js';
import type { AuthLocals } from '../../shared/auth.js';

const router = Router();
const prisma = new PrismaClient();

/* ---- List contracts ---- */
router.get(
  '/',
  [
    query('company_id').optional().isUUID(),
    query('status').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const where: Record<string, unknown> = {};
    if (req.query.company_id) where.companyId = req.query.company_id;
    if (req.query.status) where.status = req.query.status;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const [items, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        include: { deal: true, company: true, territory: true, currency: true, priceList: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.contract.count({ where }),
    ]);
    res.json({ items, total, limit, offset });
  }
);

/* ---- Get contract by ID ---- */
router.get(
  '/:id',
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: {
        deal: true,
        company: true,
        territory: true,
        currency: true,
        priceList: { include: { items: { include: { product: true } } } },
        subscriptions: { include: { product: true } },
      },
    });
    if (!contract) { next(notFound('Contract not found')); return; }
    res.json(contract);
  }
);

/* ---- Create contract ---- */
router.post(
  '/',
  body('company_id').isUUID(),
  body('territory_id').isUUID(),
  body('currency_id').isUUID(),
  body('start_date').isISO8601(),
  body('end_date').isISO8601(),
  body('deal_id').optional().isUUID(),
  body('price_list_id').optional().isUUID(),
  body('length_months').optional().isInt(),
  body('status').optional().isIn(['draft', 'active', 'expired', 'cancelled']),
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const contract = await prisma.contract.create({
      data: {
        dealId: req.body.deal_id,
        companyId: req.body.company_id,
        territoryId: req.body.territory_id,
        currencyId: req.body.currency_id,
        priceListId: req.body.price_list_id,
        startDate: new Date(req.body.start_date),
        endDate: new Date(req.body.end_date),
        lengthMonths: req.body.length_months,
        status: req.body.status || 'draft',
      },
      include: { deal: true, company: true, territory: true, currency: true },
    });
    emit({
      type: 'ContractCreated',
      at: new Date().toISOString(),
      userId: auth.userId,
      contractId: contract.id,
      dealId: contract.dealId ?? undefined,
      companyId: contract.companyId,
    });
    res.status(201).json(contract);
  }
);

/* ---- Update contract ---- */
router.patch(
  '/:id',
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const existing = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!existing) { next(notFound('Contract not found')); return; }
    const data: Record<string, unknown> = {};
    if (req.body.status !== undefined) data.status = req.body.status;
    if (req.body.start_date !== undefined) data.startDate = new Date(req.body.start_date);
    if (req.body.end_date !== undefined) data.endDate = new Date(req.body.end_date);
    if (req.body.length_months !== undefined) data.lengthMonths = req.body.length_months;
    if (req.body.price_list_id !== undefined) data.priceListId = req.body.price_list_id;
    const contract = await prisma.contract.update({
      where: { id: req.params.id },
      data,
      include: { deal: true, company: true, territory: true, currency: true },
    });
    res.json(contract);
  }
);

/* ---- List subscriptions for a contract ---- */
router.get(
  '/:id/subscriptions',
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!contract) { next(notFound('Contract not found')); return; }
    const items = await prisma.subscription.findMany({
      where: { contractId: req.params.id },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items });
  }
);

/* ---- Create subscription under contract ---- */
router.post(
  '/:id/subscriptions',
  param('id').isUUID(),
  body('product_id').isUUID(),
  body('mrr').isDecimal(),
  body('billing_cycle').isIn(['monthly', 'yearly']),
  body('renewal_date').isISO8601(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!contract) { next(notFound('Contract not found')); return; }
    const mrr = Number(req.body.mrr);
    const arr = req.body.billing_cycle === 'yearly' ? mrr : mrr * 12;
    const sub = await prisma.subscription.create({
      data: {
        contractId: req.params.id,
        productId: req.body.product_id,
        mrr,
        arr,
        billingCycle: req.body.billing_cycle,
        renewalDate: new Date(req.body.renewal_date),
        status: 'active',
      },
      include: { product: true },
    });
    res.status(201).json(sub);
  }
);

export default router;
