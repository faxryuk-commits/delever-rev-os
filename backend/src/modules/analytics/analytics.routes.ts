/**
 * Analytics & Forecast: dashboard aggregates, pipeline, revenue, CAC, forecast, commissions.
 * Reads from deal, lead, subscription, metric_snapshot, pipeline_snapshot, commission_accrual.
 */
import { Router, type Request, type Response } from 'express';
import { query } from 'express-validator';
import { PrismaClient, Prisma } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/* ---- Dashboard: quick aggregates ---- */
router.get('/dashboard', async (req: Request, res: Response): Promise<void> => {
  const [
    totalLeads,
    newLeadsThisMonth,
    openDeals,
    totalPipelineValue,
    activeSubscriptions,
    totalMrr,
  ] = await Promise.all([
    prisma.lead.count({ where: { deletedAt: null } }),
    prisma.lead.count({
      where: {
        deletedAt: null,
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
    prisma.deal.count({ where: { outcome: 'open', deletedAt: null } }),
    prisma.deal.aggregate({
      where: { outcome: 'open', deletedAt: null },
      _sum: { amount: true },
    }),
    prisma.subscription.count({ where: { status: 'active' } }),
    prisma.subscription.aggregate({
      where: { status: 'active' },
      _sum: { mrr: true },
    }),
  ]);

  res.json({
    totalLeads,
    newLeadsThisMonth,
    openDeals,
    pipelineValue: totalPipelineValue._sum.amount ?? 0,
    activeSubscriptions,
    mrr: totalMrr._sum.mrr ?? 0,
    arr: Number(totalMrr._sum.mrr ?? 0) * 12,
  });
});

/* ---- Pipeline: deals grouped by stage ---- */
router.get(
  '/pipeline',
  query('pipeline_id').optional().isUUID(),
  async (req: Request, res: Response): Promise<void> => {
    const where: Record<string, unknown> = { deletedAt: null, outcome: 'open' };
    if (req.query.pipeline_id) where.pipelineId = req.query.pipeline_id;

    const deals = await prisma.deal.findMany({
      where,
      include: { pipelineStage: true, pipeline: true },
    });

    // Group by pipeline + stage
    const grouped: Record<string, { pipeline: string; stage: string; stageOrder: number; count: number; value: number }> = {};
    for (const d of deals) {
      const key = `${d.pipelineId}:${d.pipelineStageId}`;
      if (!grouped[key]) {
        grouped[key] = {
          pipeline: d.pipeline.name,
          stage: d.pipelineStage.name,
          stageOrder: d.pipelineStage.sortOrder,
          count: 0,
          value: 0,
        };
      }
      grouped[key].count++;
      grouped[key].value += Number(d.amount ?? 0);
    }
    const items = Object.values(grouped).sort((a, b) => a.stageOrder - b.stageOrder);

    // Also return snapshots if available
    const snapshots = await prisma.pipelineSnapshot.findMany({
      orderBy: { snapshotAt: 'desc' },
      take: 50,
    });

    res.json({ stages: items, snapshots });
  }
);

/* ---- Revenue: MRR, ARR, churn, expansion ---- */
router.get('/revenue', async (_req: Request, res: Response): Promise<void> => {
  const activeSubs = await prisma.subscription.findMany({ where: { status: 'active' } });
  const cancelledSubs = await prisma.subscription.findMany({ where: { status: 'cancelled' } });

  const mrr = activeSubs.reduce((sum, s) => sum + Number(s.mrr), 0);
  const arr = activeSubs.reduce((sum, s) => sum + Number(s.arr), 0);
  const churnedMrr = cancelledSubs.reduce((sum, s) => sum + Number(s.mrr), 0);
  const churnRate = mrr + churnedMrr > 0 ? churnedMrr / (mrr + churnedMrr) : 0;

  // Latest metric snapshots
  const snapshots = await prisma.metricSnapshot.findMany({
    where: { metricKey: { in: ['mrr', 'arr', 'churn_rate', 'expansion_revenue'] } },
    orderBy: { periodAt: 'desc' },
    take: 30,
  });

  res.json({ mrr, arr, churnedMrr, churnRate, activeCount: activeSubs.length, snapshots });
});

/* ---- CAC by source/campaign/territory ---- */
router.get('/cac', async (_req: Request, res: Response): Promise<void> => {
  // CAC = total lead cost / converted customers
  const leads = await prisma.lead.findMany({
    where: { deletedAt: null },
    select: { sourceId: true, campaignId: true, territoryId: true, cost: true, status: true },
  });

  const bySource: Record<string, { cost: number; converted: number }> = {};
  for (const l of leads) {
    const key = l.sourceId || 'unknown';
    if (!bySource[key]) bySource[key] = { cost: 0, converted: 0 };
    bySource[key].cost += Number(l.cost ?? 0);
    if (l.status === 'converted') bySource[key].converted++;
  }

  const cacBySource = Object.entries(bySource).map(([sourceId, data]) => ({
    sourceId,
    totalCost: data.cost,
    converted: data.converted,
    cac: data.converted > 0 ? data.cost / data.converted : null,
  }));

  res.json({ cacBySource });
});

/* ---- Forecast: pipeline-weighted + renewal ---- */
router.get('/forecast', async (_req: Request, res: Response): Promise<void> => {
  // Weighted pipeline forecast
  const deals = await prisma.deal.findMany({
    where: { outcome: 'open', deletedAt: null },
    include: { pipelineStage: true },
  });

  const weightedPipeline = deals.reduce((sum, d) => {
    const prob = Number(d.pipelineStage.probabilityPct ?? 50) / 100;
    return sum + Number(d.amount ?? 0) * prob;
  }, 0);

  // Upcoming renewals (next 90 days)
  const renewalDate = new Date();
  renewalDate.setDate(renewalDate.getDate() + 90);
  const upcomingRenewals = await prisma.subscription.findMany({
    where: { status: 'active', renewalDate: { lte: renewalDate } },
    include: { product: true, contract: { include: { company: true } } },
  });
  const renewalMrr = upcomingRenewals.reduce((sum, s) => sum + Number(s.mrr), 0);

  res.json({
    weightedPipelineValue: weightedPipeline,
    openDealCount: deals.length,
    upcomingRenewals: upcomingRenewals.length,
    renewalMrr,
    forecastMrr: Number((await prisma.subscription.aggregate({
      where: { status: 'active' },
      _sum: { mrr: true },
    }))._sum.mrr ?? 0) + weightedPipeline * 0.1,
  });
});

/* ---- Commission analytics ---- */
router.get('/commissions', async (req: Request, res: Response): Promise<void> => {
  const periodStart = req.query.period_start
    ? new Date(req.query.period_start as string)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const periodEnd = req.query.period_end
    ? new Date(req.query.period_end as string)
    : new Date();

  const accruals = await prisma.commissionAccrual.findMany({
    where: { periodStart: { gte: periodStart }, periodEnd: { lte: periodEnd } },
    include: { salesRep: true, currency: true },
  });

  const totalAmount = accruals.reduce((sum, a) => sum + Number(a.amount), 0);
  const bySalesRep: Record<string, { name: string; total: number; count: number }> = {};
  for (const a of accruals) {
    const key = a.salesRepId;
    if (!bySalesRep[key]) bySalesRep[key] = { name: a.salesRep.name, total: 0, count: 0 };
    bySalesRep[key].total += Number(a.amount);
    bySalesRep[key].count++;
  }

  res.json({ totalAmount, accrualCount: accruals.length, bySalesRep: Object.values(bySalesRep) });
});

export default router;
