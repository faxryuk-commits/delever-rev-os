import { Router, type Request, type Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { notFound } from '../../shared/errors.js';
import { dealScope } from '../../shared/scope.js';
import type { AuthLocals } from '../../shared/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.get(
  '/deals/:dealId/activities',
  param('dealId').isUUID(),
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const scope = dealScope(auth);
    const deal = await prisma.deal.findFirst({ where: { id: req.params.dealId, deletedAt: null, ...scope } });
    if (!deal) {
      throw notFound('Deal not found');
      return;
    }
    const items = await prisma.salesActivity.findMany({
      where: { dealId: req.params.dealId },
      include: { contact: true, salesRep: true },
      orderBy: { occurredAt: 'desc' },
    });
    res.json({ items });
  }
);

router.post(
  '/deals/:dealId/activities',
  param('dealId').isUUID(),
  body('type').isIn(['call', 'meeting', 'email']),
  body('subject').optional().isString(),
  body('occurred_at').isISO8601(),
  body('duration_sec').optional().isInt().toInt(),
  body('metadata').optional().isObject(),
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const scope = dealScope(auth);
    const deal = await prisma.deal.findFirst({ where: { id: req.params.dealId, deletedAt: null, ...scope } });
    if (!deal) {
      throw notFound('Deal not found');
      return;
    }
    if (!auth.salesRepId) {
      throw notFound('Sales rep required');
      return;
    }
    const activity = await prisma.salesActivity.create({
      data: {
        dealId: req.params.dealId,
        contactId: req.body.contact_id || deal.contactId,
        salesRepId: auth.salesRepId,
        type: req.body.type,
        subject: req.body.subject,
        occurredAt: new Date(req.body.occurred_at),
        durationSec: req.body.duration_sec,
        metadata: req.body.metadata ?? undefined,
      },
      include: { contact: true, salesRep: true },
    });
    res.status(201).json(activity);
  }
);

export default router;