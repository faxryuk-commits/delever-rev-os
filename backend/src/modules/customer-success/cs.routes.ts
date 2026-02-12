/**
 * Customer Success: onboarding, health scores, activation milestones.
 * Endpoints nested under /companies/:id.
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { param, body } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { notFound } from '../../shared/errors.js';

const router = Router({ mergeParams: true });
const prisma = new PrismaClient();

/* ---- GET /companies/:companyId/onboarding ---- */
router.get(
  '/onboarding',
  param('companyId').isUUID(),
  async (req: Request, res: Response): Promise<void> => {
    const items = await prisma.onboarding.findMany({
      where: { companyId: req.params.companyId },
      include: { contract: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items });
  }
);

/* ---- PATCH /companies/:companyId/onboarding/:id ---- */
router.patch(
  '/onboarding/:id',
  param('companyId').isUUID(),
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const existing = await prisma.onboarding.findFirst({
      where: { id: req.params.id, companyId: req.params.companyId },
    });
    if (!existing) { next(notFound('Onboarding not found')); return; }
    const data: Record<string, unknown> = {};
    if (req.body.status !== undefined) data.status = req.body.status;
    if (req.body.steps !== undefined) data.steps = req.body.steps;
    const updated = await prisma.onboarding.update({
      where: { id: req.params.id },
      data,
      include: { contract: true },
    });
    res.json(updated);
  }
);

/* ---- POST /companies/:companyId/onboarding ---- */
router.post(
  '/onboarding',
  param('companyId').isUUID(),
  body('contract_id').isUUID(),
  body('status').optional().isIn(['not_started', 'in_progress', 'completed']),
  body('steps').optional().isArray(),
  async (req: Request, res: Response): Promise<void> => {
    const onboarding = await prisma.onboarding.create({
      data: {
        companyId: req.params.companyId,
        contractId: req.body.contract_id,
        status: req.body.status || 'not_started',
        steps: req.body.steps,
      },
      include: { contract: true },
    });
    res.status(201).json(onboarding);
  }
);

/* ---- GET /companies/:companyId/health-scores ---- */
router.get(
  '/health-scores',
  param('companyId').isUUID(),
  async (req: Request, res: Response): Promise<void> => {
    const items = await prisma.healthScore.findMany({
      where: { companyId: req.params.companyId },
      orderBy: { calculatedAt: 'desc' },
    });
    res.json({ items });
  }
);

/* ---- POST /companies/:companyId/health-scores ---- */
router.post(
  '/health-scores',
  param('companyId').isUUID(),
  body('score').isInt({ min: 0, max: 100 }),
  body('usage_score').optional().isInt({ min: 0, max: 100 }),
  body('support_score').optional().isInt({ min: 0, max: 100 }),
  body('payment_score').optional().isInt({ min: 0, max: 100 }),
  body('subscription_id').optional().isUUID(),
  async (req: Request, res: Response): Promise<void> => {
    const hs = await prisma.healthScore.create({
      data: {
        companyId: req.params.companyId,
        subscriptionId: req.body.subscription_id,
        score: req.body.score,
        usageScore: req.body.usage_score,
        supportScore: req.body.support_score,
        paymentScore: req.body.payment_score,
        calculatedAt: new Date(),
      },
    });
    res.status(201).json(hs);
  }
);

/* ---- GET /companies/:companyId/activation-milestones ---- */
router.get(
  '/activation-milestones',
  param('companyId').isUUID(),
  async (req: Request, res: Response): Promise<void> => {
    const items = await prisma.activationMilestone.findMany({
      where: { companyId: req.params.companyId },
      orderBy: { reachedAt: 'desc' },
    });
    res.json({ items });
  }
);

/* ---- POST /companies/:companyId/activation-milestones ---- */
router.post(
  '/activation-milestones',
  param('companyId').isUUID(),
  body('milestone_key').isString().notEmpty(),
  body('reached_at').optional().isISO8601(),
  async (req: Request, res: Response): Promise<void> => {
    const ms = await prisma.activationMilestone.create({
      data: {
        companyId: req.params.companyId,
        milestoneKey: req.body.milestone_key,
        reachedAt: req.body.reached_at ? new Date(req.body.reached_at) : new Date(),
      },
    });
    res.status(201).json(ms);
  }
);

export default router;
