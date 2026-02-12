import { Router, type Request, type Response, type NextFunction } from 'express';
import { query, body, param } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { emit } from '../../shared/events.js';
import { notFound, validationError } from '../../shared/errors.js';
import { dealScope } from '../../shared/scope.js';
import type { AuthLocals } from '../../shared/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.get(
  '/',
  [
    query('pipeline_id').optional().isUUID(),
    query('stage_id').optional().isUUID(),
    query('territory_id').optional().isUUID(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const where: Record<string, unknown> = { ...dealScope(auth), deletedAt: null };
    if (req.query.pipeline_id) where.pipelineId = req.query.pipeline_id;
    if (req.query.stage_id) where.pipelineStageId = req.query.stage_id;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const [items, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        include: {
          pipeline: true,
          pipelineStage: true,
          company: true,
          contact: true,
          lead: true,
          salesRep: true,
          currency: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.deal.count({ where }),
    ]);
    res.json({ items, total, limit, offset });
  }
);

router.get(
  '/:id',
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const scope = dealScope(auth);
    const deal = await prisma.deal.findFirst({
      where: { id: req.params.id, deletedAt: null, ...scope },
      include: {
        pipeline: true,
        pipelineStage: true,
        company: true,
        contact: true,
        lead: true,
        salesRep: true,
        currency: true,
      },
    });
    if (!deal) {
      next(notFound('Deal not found'));
      return;
    }
    res.json(deal);
  }
);

router.post(
  '/',
  body('pipeline_id').isUUID(),
  body('pipeline_stage_id').isUUID(),
  body('company_id').isUUID(),
  body('contact_id').optional().isUUID(),
  body('lead_id').optional().isUUID(),
  body('amount').optional().isNumeric(),
  body('currency_id').optional().isUUID(),
  body('expected_close_at').optional().isISO8601(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const stage = await prisma.pipelineStage.findFirst({
      where: { id: req.body.pipeline_stage_id, pipelineId: req.body.pipeline_id },
    });
    if (!stage) {
      next(validationError('Stage does not belong to pipeline'));
      return;
    }
    const deal = await prisma.deal.create({
      data: {
        pipelineId: req.body.pipeline_id,
        pipelineStageId: req.body.pipeline_stage_id,
        companyId: req.body.company_id,
        contactId: req.body.contact_id,
        leadId: req.body.lead_id,
        salesRepId: req.body.sales_rep_id || auth.salesRepId,
        amount: req.body.amount != null ? Number(req.body.amount) : undefined,
        currencyId: req.body.currency_id,
        expectedCloseAt: req.body.expected_close_at ? new Date(req.body.expected_close_at) : undefined,
        outcome: 'open',
      },
      include: {
        pipeline: true,
        pipelineStage: true,
        company: true,
        contact: true,
        lead: true,
        salesRep: true,
        currency: true,
      },
    });
    res.status(201).json(deal);
  }
);

router.patch(
  '/:id',
  param('id').isUUID(),
  body('amount').optional().isNumeric(),
  body('expected_close_at').optional().isISO8601(),
  body('contact_id').optional().isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const scope = dealScope(auth);
    const existing = await prisma.deal.findFirst({ where: { id: req.params.id, deletedAt: null, ...scope } });
    if (!existing) {
      next(notFound('Deal not found'));
      return;
    }
    const data: Record<string, unknown> = {};
    if (req.body.amount !== undefined) data.amount = req.body.amount;
    if (req.body.expected_close_at !== undefined) data.expectedCloseAt = req.body.expected_close_at ? new Date(req.body.expected_close_at) : null;
    if (req.body.contact_id !== undefined) data.contactId = req.body.contact_id;
    const deal = await prisma.deal.update({
      where: { id: req.params.id },
      data,
      include: {
        pipeline: true,
        pipelineStage: true,
        company: true,
        contact: true,
        lead: true,
        salesRep: true,
        currency: true,
      },
    });
    res.json(deal);
  }
);

router.patch(
  '/:id/stage',
  param('id').isUUID(),
  body('stage_id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const scope = dealScope(auth);
    const deal = await prisma.deal.findFirst({
      where: { id: req.params.id, deletedAt: null, ...scope },
      include: { pipeline: true, pipelineStage: true },
    });
    if (!deal) {
      next(notFound('Deal not found'));
      return;
    }
    const newStage = await prisma.pipelineStage.findFirst({
      where: { id: req.body.stage_id, pipelineId: deal.pipelineId },
    });
    if (!newStage) {
      next(validationError('Stage does not belong to this pipeline'));
      return;
    }
    const updated = await prisma.deal.update({
      where: { id: req.params.id },
      data: {
        pipelineStageId: newStage.id,
        outcome: newStage.isWon ? 'won' : newStage.isLost ? 'lost' : 'open',
        closedAt: newStage.isWon || newStage.isLost ? new Date() : undefined,
      },
      include: {
        pipeline: true,
        pipelineStage: true,
        company: true,
        contact: true,
        lead: true,
        salesRep: true,
        currency: true,
      },
    });
    emit({
      type: 'DealStageChanged',
      at: new Date().toISOString(),
      userId: auth.userId,
      dealId: deal.id,
      fromStageId: deal.pipelineStageId,
      toStageId: newStage.id,
      pipelineId: deal.pipelineId,
    });
    if (newStage.isWon) {
      emit({
        type: 'DealWon',
        at: new Date().toISOString(),
        userId: auth.userId,
        dealId: deal.id,
        amount: deal.amount ? Number(deal.amount) : undefined,
      });
    }
    if (newStage.isLost) {
      emit({ type: 'DealLost', at: new Date().toISOString(), userId: auth.userId, dealId: deal.id });
    }
    res.json(updated);
  }
);

router.get(
  '/:id/activities',
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const scope = dealScope(auth);
    const deal = await prisma.deal.findFirst({ where: { id: req.params.id, deletedAt: null, ...scope } });
    if (!deal) {
      next(notFound('Deal not found'));
      return;
    }
    const items = await prisma.salesActivity.findMany({
      where: { dealId: req.params.id },
      include: { contact: true, salesRep: true },
      orderBy: { occurredAt: 'desc' },
    });
    res.json({ items });
  }
);

router.post(
  '/:id/activities',
  param('id').isUUID(),
  body('type').isIn(['call', 'meeting', 'email']),
  body('subject').optional().isString(),
  body('occurred_at').isISO8601(),
  body('duration_sec').optional().isInt().toInt(),
  body('metadata').optional().isObject(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const scope = dealScope(auth);
    const deal = await prisma.deal.findFirst({ where: { id: req.params.id, deletedAt: null, ...scope } });
    if (!deal) {
      next(notFound('Deal not found'));
      return;
    }
    if (!auth.salesRepId) {
      next(notFound('Sales rep required'));
      return;
    }
    const activity = await prisma.salesActivity.create({
      data: {
        dealId: req.params.id,
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

router.get(
  '/:id/tasks',
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const scope = dealScope(auth);
    const deal = await prisma.deal.findFirst({ where: { id: req.params.id, deletedAt: null, ...scope } });
    if (!deal) {
      next(notFound('Deal not found'));
      return;
    }
    const items = await prisma.task.findMany({
      where: { dealId: req.params.id },
      include: { assignedTo: true },
      orderBy: { dueAt: 'asc' },
    });
    res.json({ items });
  }
);

router.post(
  '/:id/tasks',
  param('id').isUUID(),
  body('title').isString().notEmpty(),
  body('assigned_to_id').isUUID(),
  body('due_at').optional().isISO8601(),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const scope = dealScope(auth);
    const deal = await prisma.deal.findFirst({ where: { id: req.params.id, deletedAt: null, ...scope } });
    if (!deal) {
      next(notFound('Deal not found'));
      return;
    }
    const task = await prisma.task.create({
      data: {
        dealId: req.params.id,
        title: req.body.title,
        assignedToId: req.body.assigned_to_id,
        createdById: auth.userId,
        dueAt: req.body.due_at ? new Date(req.body.due_at) : undefined,
        priority: req.body.priority || 'medium',
        status: 'pending',
      },
      include: { assignedTo: true },
    });
    res.status(201).json(task);
  }
);

export default router;