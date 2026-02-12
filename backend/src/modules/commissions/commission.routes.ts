/**
 * Commission module: accruals, payouts, recalculate.
 * Sales reps see own; admin sees all.
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { query, body } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import type { AuthLocals } from '../../shared/auth.js';
import { requireRole } from '../../shared/auth.js';
import { validationError } from '../../shared/errors.js';

const router = Router();
const prisma = new PrismaClient();

/* ---- List accruals ---- */
router.get(
  '/accruals',
  [
    query('sales_rep_id').optional().isUUID(),
    query('status').optional().isString(),
    query('period_start').optional().isISO8601(),
    query('period_end').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const where: Record<string, unknown> = {};

    // Scope: sales reps see only their own
    if (auth.roleCode !== 'admin' && auth.salesRepId) {
      where.salesRepId = auth.salesRepId;
    } else if (req.query.sales_rep_id) {
      where.salesRepId = req.query.sales_rep_id;
    }
    if (req.query.status) where.status = req.query.status;
    if (req.query.period_start) {
      where.periodStart = { gte: new Date(req.query.period_start as string) };
    }

    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const [items, total] = await Promise.all([
      prisma.commissionAccrual.findMany({
        where,
        include: { salesRep: true, commissionPlan: true, deal: true, subscription: true, currency: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.commissionAccrual.count({ where }),
    ]);
    res.json({ items, total, limit, offset });
  }
);

/* ---- List payouts ---- */
router.get(
  '/payouts',
  [
    query('sales_rep_id').optional().isUUID(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const where: Record<string, unknown> = {};
    if (auth.roleCode !== 'admin' && auth.salesRepId) {
      where.salesRepId = auth.salesRepId;
    } else if (req.query.sales_rep_id) {
      where.salesRepId = req.query.sales_rep_id;
    }

    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const [items, total] = await Promise.all([
      prisma.payout.findMany({
        where,
        include: { salesRep: true, currency: true },
        orderBy: { paidAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.payout.count({ where }),
    ]);
    res.json({ items, total, limit, offset });
  }
);

/* ---- Recalculate commissions (admin only) ---- */
router.post(
  '/recalculate',
  requireRole('admin'),
  body('period_start').isISO8601(),
  body('period_end').isISO8601(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const periodStart = new Date(req.body.period_start);
    const periodEnd = new Date(req.body.period_end);

    // Get all won deals in period
    const wonDeals = await prisma.deal.findMany({
      where: {
        outcome: 'won',
        closedAt: { gte: periodStart, lte: periodEnd },
        deletedAt: null,
      },
      include: { salesRep: true, company: true },
    });

    // Get active commission plans
    const plans = await prisma.commissionPlan.findMany({
      where: {
        validFrom: { lte: periodEnd },
        OR: [{ validTo: null }, { validTo: { gte: periodStart } }],
      },
      include: { rules: true },
    });

    let created = 0;
    for (const deal of wonDeals) {
      if (!deal.salesRepId) continue;
      for (const plan of plans) {
        if (plan.type !== 'deal_pct') continue;
        // Find applicable rule
        const rule = plan.rules.find((r) => !r.territoryId || r.territoryId === deal.company?.territoryId);
        if (!rule) continue;
        const amount = Number(deal.amount ?? 0) * Number(rule.ratePct) / 100;
        if (amount <= 0) continue;

        // Check if already exists
        const existing = await prisma.commissionAccrual.findFirst({
          where: { dealId: deal.id, commissionPlanId: plan.id, salesRepId: deal.salesRepId },
        });
        if (existing) continue;

        await prisma.commissionAccrual.create({
          data: {
            salesRepId: deal.salesRepId,
            commissionPlanId: plan.id,
            dealId: deal.id,
            amount,
            currencyId: deal.currencyId || (await prisma.currency.findFirst())!.id,
            periodStart,
            periodEnd,
            status: 'pending',
            accrualType: 'deal',
          },
        });
        created++;
      }
    }

    res.json({ message: 'Recalculation complete', accrualsCreated: created });
  }
);

export default router;
