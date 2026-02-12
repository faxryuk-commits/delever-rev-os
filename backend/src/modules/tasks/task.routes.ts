import { Router, type Request, type Response, type NextFunction } from 'express';
import { query, body, param, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { notFound } from '../../shared/errors.js';
import { dealScope } from '../../shared/scope.js';
import type { AuthLocals } from '../../shared/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.get(
  '/',
  [
    query('deal_id').optional().isUUID(),
    query('lead_id').optional().isUUID(),
    query('status').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const where: Record<string, unknown> = {};
    if (auth.roleCode !== 'admin') {
      where.assignedToId = auth.salesRepId;
    }
    if (req.query.deal_id) where.dealId = req.query.deal_id;
    if (req.query.lead_id) where.leadId = req.query.lead_id;
    if (req.query.status) where.status = req.query.status;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: { deal: true, lead: true, assignedTo: true },
        orderBy: { dueAt: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.task.count({ where }),
    ]);
    res.json({ items, total, limit, offset });
  }
);

router.get(
  '/:id',
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { deal: true, lead: true, assignedTo: true },
    });
    if (!task) {
      next(notFound('Task not found'));
      return;
    }
    if (auth.roleCode !== 'admin' && task.assignedToId !== auth.salesRepId) {
      next(notFound('Task not found'));
      return;
    }
    res.json(task);
  }
);

router.post(
  '/',
  body('title').isString().notEmpty(),
  body('deal_id').optional().isUUID(),
  body('lead_id').optional().isUUID(),
  body('assigned_to_id').isUUID(),
  body('due_at').optional().isISO8601(),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const task = await prisma.task.create({
      data: {
        title: req.body.title,
        dealId: req.body.deal_id,
        leadId: req.body.lead_id,
        assignedToId: req.body.assigned_to_id,
        createdById: auth.userId,
        dueAt: req.body.due_at ? new Date(req.body.due_at) : undefined,
        priority: req.body.priority || 'medium',
        status: 'pending',
      },
      include: { deal: true, lead: true, assignedTo: true },
    });
    res.status(201).json(task);
  }
);

router.patch(
  '/:id',
  param('id').isUUID(),
  body('status').optional().isIn(['pending', 'done', 'cancelled']),
  body('due_at').optional().isISO8601(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      next(notFound('Task not found'));
      return;
    }
    if (auth.roleCode !== 'admin' && existing.assignedToId !== auth.salesRepId) {
      next(notFound('Task not found'));
      return;
    }
    const data: Record<string, unknown> = {};
    if (req.body.status !== undefined) data.status = req.body.status;
    if (req.body.due_at !== undefined) data.dueAt = req.body.due_at ? new Date(req.body.due_at) : null;
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data,
      include: { deal: true, lead: true, assignedTo: true },
    });
    res.json(task);
  }
);

export default router;