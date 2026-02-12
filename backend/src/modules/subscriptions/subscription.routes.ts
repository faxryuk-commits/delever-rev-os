import { Router, type Request, type Response, type NextFunction } from 'express';
import { query, param, body } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { notFound } from '../../shared/errors.js';

const router = Router();
const prisma = new PrismaClient();

/* ---- List subscriptions (with optional renewal filter) ---- */
router.get(
  '/',
  [
    query('status').optional().isString(),
    query('renewal_from').optional().isISO8601(),
    query('renewal_to').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const where: Record<string, unknown> = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.renewal_from || req.query.renewal_to) {
      const renewalDate: Record<string, Date> = {};
      if (req.query.renewal_from) renewalDate.gte = new Date(req.query.renewal_from as string);
      if (req.query.renewal_to) renewalDate.lte = new Date(req.query.renewal_to as string);
      where.renewalDate = renewalDate;
    }
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const [items, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: { product: true, contract: { include: { company: true } } },
        orderBy: { renewalDate: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.subscription.count({ where }),
    ]);
    res.json({ items, total, limit, offset });
  }
);

/* ---- Get subscription by ID ---- */
router.get(
  '/:id',
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const sub = await prisma.subscription.findUnique({
      where: { id: req.params.id },
      include: {
        product: true,
        contract: { include: { company: true, territory: true, currency: true } },
      },
    });
    if (!sub) { next(notFound('Subscription not found')); return; }
    res.json(sub);
  }
);

/* ---- Update subscription ---- */
router.patch(
  '/:id',
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const existing = await prisma.subscription.findUnique({ where: { id: req.params.id } });
    if (!existing) { next(notFound('Subscription not found')); return; }
    const data: Record<string, unknown> = {};
    if (req.body.status !== undefined) data.status = req.body.status;
    if (req.body.mrr !== undefined) {
      data.mrr = Number(req.body.mrr);
      data.arr = existing.billingCycle === 'yearly' ? Number(req.body.mrr) : Number(req.body.mrr) * 12;
    }
    if (req.body.renewal_date !== undefined) data.renewalDate = new Date(req.body.renewal_date);
    if (req.body.churn_risk !== undefined) data.churnRisk = req.body.churn_risk;
    const sub = await prisma.subscription.update({
      where: { id: req.params.id },
      data,
      include: { product: true, contract: { include: { company: true } } },
    });
    res.json(sub);
  }
);

/* ---- List invoices for subscription ---- */
router.get(
  '/:id/invoices',
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const sub = await prisma.subscription.findUnique({ where: { id: req.params.id } });
    if (!sub) { next(notFound('Subscription not found')); return; }
    const items = await prisma.invoice.findMany({
      where: { subscriptionId: req.params.id },
      include: { currency: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items });
  }
);

export default router;
