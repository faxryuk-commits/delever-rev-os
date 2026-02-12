/**
 * Webhooks: external lead capture (site/UTM, telegram, instagram).
 * Idempotency via X-Idempotency-Key header.
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { body } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { emit } from '../../shared/events.js';
import { validationError, conflict } from '../../shared/errors.js';

const router = Router();
const prisma = new PrismaClient();

async function checkIdempotency(key: string | undefined): Promise<{ duplicate: boolean; result?: unknown }> {
  if (!key) return { duplicate: false };
  const existing = await prisma.idempotencyKey.findUnique({ where: { key } });
  if (existing) return { duplicate: true, result: existing.result };
  return { duplicate: false };
}

async function saveIdempotency(key: string | undefined, result: unknown): Promise<void> {
  if (!key) return;
  await prisma.idempotencyKey.create({ data: { key, result: result as any } }).catch(() => {});
}

/**
 * Core function: create lead from external payload.
 * Handles company/contact auto-creation, source/campaign mapping.
 */
async function createLeadFromPayload(payload: Record<string, any>) {
  let companyId = payload.company_id;
  if (!companyId && payload.company_name) {
    const company = await prisma.company.create({
      data: {
        name: payload.company_name,
        domain: payload.company_domain,
        territoryId: payload.territory_id,
      },
    });
    companyId = company.id;
  }

  let contactId = payload.contact_id;
  if (!contactId && (payload.contact_name || payload.contact_email)) {
    const contact = await prisma.contact.create({
      data: {
        name: payload.contact_name || payload.contact_email,
        email: payload.contact_email,
        phone: payload.contact_phone,
        companyId,
      },
    });
    contactId = contact.id;
  }

  // Resolve source by code if provided
  let sourceId = payload.source_id;
  if (!sourceId && payload.source_code) {
    const src = await prisma.source.findUnique({ where: { code: payload.source_code } });
    if (src) sourceId = src.id;
  }

  const lead = await prisma.lead.create({
    data: {
      companyId,
      contactId,
      sourceId,
      campaignId: payload.campaign_id,
      territoryId: payload.territory_id,
      partnerId: payload.partner_id,
      channel: payload.channel,
      cost: payload.cost ? Number(payload.cost) : undefined,
      referralTrackingId: payload.referral_tracking_id,
      status: 'new',
    },
    include: { company: true, contact: true, source: true, campaign: true, territory: true },
  });

  emit({
    type: 'LeadCreated',
    at: new Date().toISOString(),
    leadId: lead.id,
    sourceId: lead.sourceId ?? undefined,
    campaignId: lead.campaignId ?? undefined,
    territoryId: lead.territoryId ?? undefined,
  });

  return lead;
}

/* ---- POST /webhooks/leads - generic lead capture (site, UTM, partner) ---- */
router.post(
  '/leads',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const idempKey = req.headers['x-idempotency-key'] as string | undefined;
    const check = await checkIdempotency(idempKey);
    if (check.duplicate) { res.status(200).json(check.result); return; }

    try {
      const lead = await createLeadFromPayload(req.body);
      await saveIdempotency(idempKey, lead);
      res.status(201).json(lead);
    } catch (err) {
      next(err);
    }
  }
);

/* ---- POST /webhooks/telegram ---- */
router.post(
  '/telegram',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const idempKey = req.headers['x-idempotency-key'] as string | undefined;
    const check = await checkIdempotency(idempKey);
    if (check.duplicate) { res.status(200).json(check.result); return; }

    try {
      const payload = {
        ...req.body,
        channel: 'telegram',
        source_code: req.body.source_code || 'telegram',
      };
      const lead = await createLeadFromPayload(payload);
      await saveIdempotency(idempKey, lead);
      res.status(201).json(lead);
    } catch (err) {
      next(err);
    }
  }
);

/* ---- POST /webhooks/instagram ---- */
router.post(
  '/instagram',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const idempKey = req.headers['x-idempotency-key'] as string | undefined;
    const check = await checkIdempotency(idempKey);
    if (check.duplicate) { res.status(200).json(check.result); return; }

    try {
      const payload = {
        ...req.body,
        channel: 'instagram',
        source_code: req.body.source_code || 'instagram',
      };
      const lead = await createLeadFromPayload(payload);
      await saveIdempotency(idempKey, lead);
      res.status(201).json(lead);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
