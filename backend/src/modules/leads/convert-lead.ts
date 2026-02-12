/**
 * Convert lead to deal: creates deal in default New Business pipeline, first stage.
 * Single place for conversion logic so no unclear steps.
 */

import { PrismaClient } from '@prisma/client';
import { notFound } from '../../shared/errors.js';
import { emit } from '../../shared/events.js';
import type { AuthLocals } from '../../shared/auth.js';

const prisma = new PrismaClient();

export async function convertLeadToDeal(
  leadId: string,
  auth: AuthLocals,
  options?: { pipelineId?: string; stageId?: string; amount?: number; currencyId?: string }
): Promise<{ dealId: string }> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, deletedAt: null },
    include: { company: true, contact: true },
  });
  if (!lead || !lead.companyId) {
    throw notFound('Lead not found or has no company');
  }
  let pipelineId = options?.pipelineId;
  let stageId = options?.stageId;
  if (!pipelineId) {
    const nb = await prisma.pipeline.findUnique({ where: { code: 'new_business' } });
    if (!nb) throw notFound('New Business pipeline not found');
    pipelineId = nb.id;
  }
  if (!stageId) {
    const firstStage = await prisma.pipelineStage.findFirst({
      where: { pipelineId },
      orderBy: { sortOrder: 'asc' },
    });
    if (!firstStage) throw notFound('No stages in pipeline');
    stageId = firstStage.id;
  }
  const deal = await prisma.deal.create({
    data: {
      pipelineId,
      pipelineStageId: stageId,
      companyId: lead.companyId,
      contactId: lead.contactId ?? undefined,
      leadId: lead.id,
      salesRepId: auth.salesRepId ?? undefined,
      amount: options?.amount ?? undefined,
      currencyId: options?.currencyId ?? undefined,
      outcome: 'open',
    },
  });
  await prisma.lead.update({
    where: { id: leadId },
    data: { status: 'converted' },
  });
  emit({
    type: 'LeadConverted',
    at: new Date().toISOString(),
    userId: auth.userId,
    leadId: lead.id,
    dealId: deal.id,
  });
  return { dealId: deal.id };
}
