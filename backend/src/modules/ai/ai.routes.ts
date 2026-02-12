/**
 * AI Layer: lead scoring, deal risk detection, forecast, next actions.
 * Rule-based implementation; can be replaced by ML models later.
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { param } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { notFound } from '../../shared/errors.js';

const router = Router();
const prisma = new PrismaClient();

/** Simple rule-based lead scoring (0-100) */
function calculateLeadScore(lead: Record<string, any>): number {
  let score = 20; // base
  if (lead.companyId) score += 15;
  if (lead.contactId) score += 10;
  if (lead.sourceId) score += 10;
  if (lead.campaignId) score += 5;
  if (lead.territoryId) score += 5;
  if (lead.channel) score += 5;
  // Activity bonus
  if (lead._count?.activities > 0) score += Math.min(lead._count.activities * 5, 20);
  if (lead.status === 'qualified') score += 10;
  if (lead.status === 'contacted') score += 5;
  return Math.min(score, 100);
}

/* ---- GET /leads/:id/score ---- */
router.get(
  '/leads/:id/score',
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        company: true,
        contact: true,
        source: true,
        campaign: true,
        territory: true,
        _count: { select: { activities: true } },
      },
    });
    if (!lead) { next(notFound('Lead not found')); return; }

    const score = calculateLeadScore(lead);
    // Update score in DB
    await prisma.lead.update({ where: { id: req.params.id }, data: { score } });

    res.json({
      leadId: lead.id,
      score,
      factors: {
        hasCompany: !!lead.companyId,
        hasContact: !!lead.contactId,
        hasSource: !!lead.sourceId,
        hasCampaign: !!lead.campaignId,
        activityCount: (lead as any)._count?.activities ?? 0,
        status: lead.status,
      },
    });
  }
);

/* ---- POST /ai/score-leads (batch) ---- */
router.post(
  '/score-leads',
  async (req: Request, res: Response): Promise<void> => {
    const leads = await prisma.lead.findMany({
      where: { deletedAt: null, status: { not: 'converted' } },
      include: { _count: { select: { activities: true } } },
    });

    let updated = 0;
    for (const lead of leads) {
      const score = calculateLeadScore(lead);
      await prisma.lead.update({ where: { id: lead.id }, data: { score } });
      updated++;
    }

    res.json({ message: 'Scoring complete', leadsScored: updated });
  }
);

/* ---- GET /deals/:id/risk ---- */
router.get(
  '/deals/:id/risk',
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const deal = await prisma.deal.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        pipelineStage: true,
        activities: { orderBy: { occurredAt: 'desc' }, take: 5 },
        tasks: { where: { status: 'pending' } },
      },
    });
    if (!deal) { next(notFound('Deal not found')); return; }

    // Risk factors
    const risks: string[] = [];
    let riskScore = 0;

    // Check time in stage
    const hoursInStage = (Date.now() - deal.updatedAt.getTime()) / (1000 * 60 * 60);
    const slaHours = deal.pipelineStage.slaHours ?? 72;
    if (hoursInStage > slaHours) {
      risks.push(`Сделка в стадии "${deal.pipelineStage.name}" уже ${Math.round(hoursInStage)}ч (SLA: ${slaHours}ч)`);
      riskScore += 30;
    }

    // Check activity gap
    const lastActivity = deal.activities[0];
    if (!lastActivity) {
      risks.push('Нет активностей по сделке');
      riskScore += 25;
    } else {
      const daysSinceActivity = (Date.now() - lastActivity.occurredAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceActivity > 7) {
        risks.push(`Последняя активность ${Math.round(daysSinceActivity)} дней назад`);
        riskScore += 20;
      }
    }

    // Overdue tasks
    const overdueTasks = deal.tasks.filter((t) => t.dueAt && t.dueAt < new Date());
    if (overdueTasks.length > 0) {
      risks.push(`${overdueTasks.length} просроченных задач`);
      riskScore += 15;
    }

    // Probability factor
    const prob = Number(deal.pipelineStage.probabilityPct ?? 50);
    if (prob < 30) riskScore += 10;

    riskScore = Math.min(riskScore, 100);
    const riskLevel = riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low';

    // Next action recommendations
    const nextActions: string[] = [];
    if (!lastActivity) nextActions.push('Запланировать звонок или встречу');
    if (overdueTasks.length > 0) nextActions.push('Выполнить просроченные задачи');
    if (hoursInStage > slaHours) nextActions.push('Продвинуть сделку на следующую стадию');
    if (nextActions.length === 0) nextActions.push('Отправить follow-up или кейс клиенту');

    res.json({
      dealId: deal.id,
      riskScore,
      riskLevel,
      risks,
      nextActions,
      hoursInStage: Math.round(hoursInStage),
      lastActivityAt: lastActivity?.occurredAt ?? null,
      pendingTasks: deal.tasks.length,
    });
  }
);

/* ---- GET /ai/forecast ---- */
router.get('/forecast', async (_req: Request, res: Response): Promise<void> => {
  // Weighted pipeline forecast
  const deals = await prisma.deal.findMany({
    where: { outcome: 'open', deletedAt: null },
    include: { pipelineStage: true },
  });

  const weightedValue = deals.reduce((sum, d) => {
    const prob = Number(d.pipelineStage.probabilityPct ?? 50) / 100;
    return sum + Number(d.amount ?? 0) * prob;
  }, 0);

  // Current MRR
  const mrrAgg = await prisma.subscription.aggregate({
    where: { status: 'active' },
    _sum: { mrr: true },
  });
  const currentMrr = Number(mrrAgg._sum.mrr ?? 0);

  // Forecast: current MRR + likely new revenue from pipeline
  const forecast3m = currentMrr * 3 + weightedValue * 0.7;
  const forecast6m = currentMrr * 6 + weightedValue;

  res.json({
    currentMrr,
    weightedPipelineValue: weightedValue,
    openDealCount: deals.length,
    forecast3months: Math.round(forecast3m),
    forecast6months: Math.round(forecast6m),
    assumptions: 'Pipeline weighted by stage probability; MRR projected linearly',
  });
});

/* ---- GET /ai/next-actions ---- */
router.get('/next-actions', async (_req: Request, res: Response): Promise<void> => {
  // Find deals and leads that need attention
  const stuckDeals = await prisma.deal.findMany({
    where: { outcome: 'open', deletedAt: null },
    include: { pipelineStage: true, company: true, salesRep: true },
    orderBy: { updatedAt: 'asc' },
    take: 10,
  });

  const actions = stuckDeals.map((deal) => {
    const hoursStuck = (Date.now() - deal.updatedAt.getTime()) / (1000 * 60 * 60);
    const sla = deal.pipelineStage.slaHours ?? 72;
    const isOverdue = hoursStuck > sla;

    let action = 'Follow-up с клиентом';
    if (isOverdue) action = `Срочно: сделка в "${deal.pipelineStage.name}" уже ${Math.round(hoursStuck)}ч`;
    else if (deal.pipelineStage.name.toLowerCase().includes('demo')) action = 'Подготовить и провести демо';
    else if (deal.pipelineStage.name.toLowerCase().includes('proposal')) action = 'Подготовить коммерческое предложение';
    else if (deal.pipelineStage.name.toLowerCase().includes('negotiation')) action = 'Согласовать условия и закрыть сделку';

    return {
      dealId: deal.id,
      company: deal.company?.name,
      salesRep: deal.salesRep?.name,
      stage: deal.pipelineStage.name,
      hoursInStage: Math.round(hoursStuck),
      slaHours: sla,
      isOverdue,
      recommendedAction: action,
    };
  });

  res.json({ actions });
});

export default router;
