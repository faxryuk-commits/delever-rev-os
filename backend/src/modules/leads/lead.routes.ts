import { Router, type Request, type Response, type NextFunction } from 'express';
import { query, body, param, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { emit } from '../../shared/events.js';
import { notFound } from '../../shared/errors.js';
import { leadScope } from '../../shared/scope.js';
import type { AuthLocals } from '../../shared/auth.js';

const router = Router();
const prisma = new PrismaClient();

const listValidators = [
  query('status').optional().isString(),
  query('source_id').optional().isUUID(),
  query('territory_id').optional().isUUID(),
  query('assigned_to_id').optional().isUUID(),
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
  query('sort').optional().isIn(['createdAt', 'score', 'updatedAt']),
  query('order').optional().isIn(['asc', 'desc']),
  query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
];

router.get(
  '/',
  listValidators,
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid query', details: errors.array() });
      return;
    }
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const where: Record<string, unknown> = { ...leadScope(auth), deletedAt: null };
    if (req.query.status) where.status = req.query.status;
    if (req.query.source_id) where.sourceId = req.query.source_id;
    if (req.query.territory_id) where.territoryId = req.query.territory_id;
    if (req.query.assigned_to_id) where.assignedToId = req.query.assigned_to_id;
    if (req.query.date_from) where.createdAt = { ...(where.createdAt as object), gte: new Date(req.query.date_from as string) };
    if (req.query.date_to) where.createdAt = { ...(where.createdAt as object), lte: new Date(req.query.date_to as string) };
    const sort = (req.query.sort as string) || 'createdAt';
    const order = (req.query.order as string) || 'desc';
    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: { source: true, campaign: true, territory: true, company: true, contact: true, assignedTo: true },
        orderBy: { [sort]: order },
        take: limit,
        skip: offset,
      }),
      prisma.lead.count({ where }),
    ]);
    res.json({ items, total, limit, offset });
  }
);

router.get(
  '/:id',
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const scope = leadScope(auth);
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, deletedAt: null, ...scope },
      include: { source: true, campaign: true, territory: true, company: true, contact: true, assignedTo: true },
    });
    if (!lead) {
      next(notFound('Lead not found'));
      return;
    }
    res.json(lead);
  }
);

router.post(
  '/',
  body('company_id').optional().isUUID(),
  body('contact_id').optional().isUUID(),
  body('source_id').optional().isUUID(),
  body('campaign_id').optional().isUUID(),
  body('territory_id').optional().isUUID(),
  body('partner_id').optional().isUUID(),
  body('channel').optional().isString(),
  body('cost').optional().isNumeric().toFloat(),
  body('referral_tracking_id').optional().isString(),
  body('status').optional().isString(),
  body('assigned_to_id').optional().isUUID(),
  body('company_name').optional().isString(),
  body('contact_name').optional().isString(),
  body('contact_email').optional().isString(),
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors.array() });
      return;
    }
    const data = req.body as Record<string, unknown>;
    let companyId = data.company_id as string | undefined;
    let contactId = data.contact_id as string | undefined;
    if (data.company_name && !companyId) {
      const company = await prisma.company.create({
        data: {
          name: data.company_name as string,
          territoryId: ((data.territory_id as string) || auth.territoryId) ?? undefined,
        },
      });
      companyId = company.id;
    }
    if ((data.contact_name || data.contact_email) && !contactId && companyId) {
      const contact = await prisma.contact.create({
        data: {
          companyId,
          name: (data.contact_name as string) || 'Unknown',
          email: (data.contact_email as string) || undefined,
        },
      });
      contactId = contact.id;
    }
    const lead = await prisma.lead.create({
      data: {
        companyId: companyId ?? undefined,
        contactId: contactId ?? undefined,
        sourceId: data.source_id as string || undefined,
        campaignId: data.campaign_id as string || undefined,
        territoryId: ((data.territory_id as string) || auth.territoryId) ?? undefined,
        partnerId: data.partner_id as string || undefined,
        channel: data.channel as string || undefined,
        cost: data.cost != null ? Number(data.cost) : undefined,
        referralTrackingId: data.referral_tracking_id as string || undefined,
        status: (data.status as string) || 'new',
        assignedToId: ((data.assigned_to_id as string) || auth.salesRepId) ?? undefined,
      },
      include: { source: true, campaign: true, territory: true, company: true, contact: true, assignedTo: true },
    });
    emit({
      type: 'LeadCreated',
      at: new Date().toISOString(),
      userId: auth.userId,
      leadId: lead.id,
      sourceId: lead.sourceId ?? undefined,
      campaignId: lead.campaignId ?? undefined,
      territoryId: lead.territoryId ?? undefined,
    });
    res.status(201).json(lead);
  }
);

router.patch(
  '/:id',
  param('id').isUUID(),
  body('status').optional().isString(),
  body('assigned_to_id').optional().isUUID(),
  body('score').optional().isNumeric(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const scope = leadScope(auth);
    const existing = await prisma.lead.findFirst({ where: { id: req.params.id, deletedAt: null, ...scope } });
    if (!existing) {
      next(notFound('Lead not found'));
      return;
    }
    const data: Record<string, unknown> = {};
    if (req.body.status !== undefined) data.status = req.body.status;
    if (req.body.assigned_to_id !== undefined) data.assignedToId = req.body.assigned_to_id;
    if (req.body.score !== undefined) data.score = req.body.score;
    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data,
      include: { source: true, campaign: true, territory: true, company: true, contact: true, assignedTo: true },
    });
    res.json(lead);
  }
);

router.post(
  '/:id/convert',
  param('id').isUUID(),
  body('pipeline_id').optional().isUUID(),
  body('stage_id').optional().isUUID(),
  body('amount').optional().isNumeric(),
  body('currency_id').optional().isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    try {
      const { convertLeadToDeal } = await import('./convert-lead.js');
      const result = await convertLeadToDeal(req.params.id, auth, {
        pipelineId: req.body.pipeline_id,
        stageId: req.body.stage_id,
        amount: req.body.amount != null ? Number(req.body.amount) : undefined,
        currencyId: req.body.currency_id,
      });
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  }
);

router.delete(
  '/:id',
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const scope = leadScope(auth);
    const existing = await prisma.lead.findFirst({ where: { id: req.params.id, ...scope } });
    if (!existing) {
      next(notFound('Lead not found'));
      return;
    }
    await prisma.lead.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.status(204).send();
  }
);

export default router;
