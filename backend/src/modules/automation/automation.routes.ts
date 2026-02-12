/**
 * Automation: workflow rules + internal jobs (SLA check, metrics snapshot).
 * /internal/jobs/* protected by X-Internal-Secret header.
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { body, param } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { notFound, forbidden } from '../../shared/errors.js';
import { requireRole } from '../../shared/auth.js';

const router = Router();
const prisma = new PrismaClient();

const INTERNAL_SECRET = process.env.INTERNAL_JOB_SECRET || 'internal-secret';

function requireInternalSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = req.headers['x-internal-secret'];
  if (secret !== INTERNAL_SECRET) { next(forbidden('Invalid internal secret')); return; }
  next();
}

/* ---- Workflows CRUD ---- */
router.get('/workflows', async (_req: Request, res: Response): Promise<void> => {
  const items = await prisma.workflow.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ items });
});

router.post(
  '/workflows',
  requireRole('admin'),
  body('name').isString().notEmpty(),
  body('trigger_entity').isString().notEmpty(),
  body('trigger_event').isString().notEmpty(),
  body('conditions').optional().isObject(),
  body('actions').optional().isObject(),
  async (req: Request, res: Response): Promise<void> => {
    const wf = await prisma.workflow.create({
      data: {
        name: req.body.name,
        triggerEntity: req.body.trigger_entity,
        triggerEvent: req.body.trigger_event,
        conditions: req.body.conditions,
        actions: req.body.actions,
        isActive: true,
      },
    });
    res.status(201).json(wf);
  }
);

router.patch(
  '/workflows/:id',
  requireRole('admin'),
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const existing = await prisma.workflow.findUnique({ where: { id: req.params.id } });
    if (!existing) { next(notFound('Workflow not found')); return; }
    const data: Record<string, unknown> = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.trigger_entity !== undefined) data.triggerEntity = req.body.trigger_entity;
    if (req.body.trigger_event !== undefined) data.triggerEvent = req.body.trigger_event;
    if (req.body.conditions !== undefined) data.conditions = req.body.conditions;
    if (req.body.actions !== undefined) data.actions = req.body.actions;
    if (req.body.is_active !== undefined) data.isActive = req.body.is_active;
    const wf = await prisma.workflow.update({ where: { id: req.params.id }, data });
    res.json(wf);
  }
);

export default router;

/* ---- Internal Jobs (separate router, no auth middleware) ---- */
export const internalJobsRouter = Router();

/* POST /internal/jobs/sla-check */
internalJobsRouter.post('/sla-check', requireInternalSecret, async (_req: Request, res: Response): Promise<void> => {
  // Check open deals for SLA violations
  const deals = await prisma.deal.findMany({
    where: { outcome: 'open', deletedAt: null },
    include: { pipelineStage: true },
  });

  let violations = 0;
  const now = Date.now();
  for (const deal of deals) {
    if (!deal.pipelineStage.slaHours) continue;
    const updatedMs = deal.updatedAt.getTime();
    const hoursInStage = (now - updatedMs) / (1000 * 60 * 60);
    if (hoursInStage > deal.pipelineStage.slaHours) {
      violations++;
      // Auto-create task for SLA violation
      if (deal.salesRepId) {
        const existingTask = await prisma.task.findFirst({
          where: { dealId: deal.id, title: { startsWith: '[SLA]' }, status: 'pending' },
        });
        if (!existingTask) {
          await prisma.task.create({
            data: {
              dealId: deal.id,
              assignedToId: deal.salesRepId,
              title: `[SLA] Deal stuck in "${deal.pipelineStage.name}" for ${Math.round(hoursInStage)}h`,
              status: 'pending',
              priority: 'high',
            },
          });
        }
      }
    }
  }

  res.json({ checked: deals.length, violations });
});

/* POST /internal/jobs/metrics-snapshot */
internalJobsRouter.post('/metrics-snapshot', requireInternalSecret, async (_req: Request, res: Response): Promise<void> => {
  const now = new Date();

  // MRR snapshot
  const mrrAgg = await prisma.subscription.aggregate({
    where: { status: 'active' },
    _sum: { mrr: true, arr: true },
  });
  await prisma.metricSnapshot.create({
    data: { metricKey: 'mrr', value: mrrAgg._sum.mrr ?? 0, periodType: 'day', periodAt: now },
  });
  await prisma.metricSnapshot.create({
    data: { metricKey: 'arr', value: mrrAgg._sum.arr ?? 0, periodType: 'day', periodAt: now },
  });

  // Lead count snapshot
  const leadCount = await prisma.lead.count({
    where: { deletedAt: null, createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } },
  });
  await prisma.metricSnapshot.create({
    data: { metricKey: 'leads_today', value: leadCount, periodType: 'day', periodAt: now },
  });

  // Pipeline snapshots
  const stages = await prisma.pipelineStage.findMany();
  for (const stage of stages) {
    const dealAgg = await prisma.deal.aggregate({
      where: { pipelineStageId: stage.id, outcome: 'open', deletedAt: null },
      _count: true,
      _sum: { amount: true },
    });
    const prob = Number(stage.probabilityPct ?? 50) / 100;
    await prisma.pipelineSnapshot.create({
      data: {
        pipelineId: stage.pipelineId,
        stageId: stage.id,
        dealCount: dealAgg._count,
        weightedValue: Number(dealAgg._sum.amount ?? 0) * prob,
        snapshotAt: now,
      },
    });
  }

  // Churn rate
  const activeSubs = await prisma.subscription.count({ where: { status: 'active' } });
  const cancelledSubs = await prisma.subscription.count({ where: { status: 'cancelled' } });
  const churnRate = activeSubs + cancelledSubs > 0
    ? cancelledSubs / (activeSubs + cancelledSubs)
    : 0;
  await prisma.metricSnapshot.create({
    data: { metricKey: 'churn_rate', value: churnRate, periodType: 'day', periodAt: now },
  });

  res.json({ message: 'Metrics snapshot created', timestamp: now.toISOString() });
});
