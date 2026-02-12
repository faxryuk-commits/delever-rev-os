import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';

type DashboardData = {
  totalLeads: number;
  newLeadsThisMonth: number;
  openDeals: number;
  pipelineValue: number;
  activeSubscriptions: number;
  mrr: number;
  arr: number;
};

type PipelineStage = { pipeline: string; stage: string; count: number; value: number };
type RevenueData = { mrr: number; arr: number; churnedMrr: number; churnRate: number; activeCount: number };
type CacEntry = { sourceId: string; totalCost: number; converted: number; cac: number | null };
type ForecastData = {
  weightedPipelineValue: number;
  openDealCount: number;
  upcomingRenewals: number;
  renewalMrr: number;
  forecastMrr: number;
};

export default function Analytics() {
  const { api } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [cacData, setCacData] = useState<CacEntry[]>([]);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dashRes, pipeRes, revRes, cacRes, fcRes] = await Promise.all([
          api('/analytics/dashboard'),
          api('/analytics/pipeline'),
          api('/analytics/revenue'),
          api('/analytics/cac'),
          api('/analytics/forecast'),
        ]);
        if (!cancelled) {
          if (dashRes.ok) setDashboard(await dashRes.json());
          if (pipeRes.ok) { const d = await pipeRes.json(); setPipelineStages(d.stages ?? []); }
          if (revRes.ok) setRevenue(await revRes.json());
          if (cacRes.ok) { const d = await cacRes.json(); setCacData(d.cacBySource ?? []); }
          if (fcRes.ok) setForecast(await fcRes.json());
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api]);

  if (loading) return <div>Загрузка аналитики...</div>;
  if (error) return <div style={{ color: '#b91c1c' }}>{error}</div>;

  const cardStyle: React.CSSProperties = {
    background: '#fff', borderRadius: 8, padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)', flex: '1 1 200px', minWidth: 180,
  };
  const metricStyle: React.CSSProperties = { fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' };
  const labelStyle: React.CSSProperties = { fontSize: '0.85rem', color: '#64748b', marginBottom: 4 };

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Аналитика</h1>

      {/* KPI Cards */}
      {dashboard && (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <div style={cardStyle}><div style={labelStyle}>MRR</div><div style={metricStyle}>{Number(dashboard.mrr).toLocaleString()}</div></div>
          <div style={cardStyle}><div style={labelStyle}>ARR</div><div style={metricStyle}>{Number(dashboard.arr).toLocaleString()}</div></div>
          <div style={cardStyle}><div style={labelStyle}>Открытые сделки</div><div style={metricStyle}>{dashboard.openDeals}</div></div>
          <div style={cardStyle}><div style={labelStyle}>Pipeline Value</div><div style={metricStyle}>{Number(dashboard.pipelineValue).toLocaleString()}</div></div>
          <div style={cardStyle}><div style={labelStyle}>Лиды (месяц)</div><div style={metricStyle}>{dashboard.newLeadsThisMonth}</div></div>
          <div style={cardStyle}><div style={labelStyle}>Активные подписки</div><div style={metricStyle}>{dashboard.activeSubscriptions}</div></div>
        </div>
      )}

      {/* Pipeline Breakdown */}
      <h2 style={{ marginBottom: '0.5rem' }}>Воронка продаж</h2>
      {pipelineStages.length > 0 ? (
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '1rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {pipelineStages.map((s, i) => (
              <div key={i} style={{
                flex: '1 1 120px', textAlign: 'center', padding: '0.75rem',
                background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0',
              }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.pipeline}</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.stage}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2563eb' }}>{s.count}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>Нет данных по воронке.</p>
      )}

      {/* Revenue */}
      {revenue && (
        <>
          <h2 style={{ marginBottom: '0.5rem' }}>Revenue</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <div style={cardStyle}><div style={labelStyle}>MRR</div><div style={metricStyle}>{revenue.mrr.toLocaleString()}</div></div>
            <div style={cardStyle}><div style={labelStyle}>ARR</div><div style={metricStyle}>{revenue.arr.toLocaleString()}</div></div>
            <div style={cardStyle}><div style={labelStyle}>Churned MRR</div><div style={metricStyle}>{revenue.churnedMrr.toLocaleString()}</div></div>
            <div style={cardStyle}><div style={labelStyle}>Churn Rate</div><div style={metricStyle}>{(revenue.churnRate * 100).toFixed(1)}%</div></div>
          </div>
        </>
      )}

      {/* CAC */}
      {cacData.length > 0 && (
        <>
          <h2 style={{ marginBottom: '0.5rem' }}>CAC по источнику</h2>
          <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: '2rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Источник</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Затраты</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Конверсии</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>CAC</th>
                </tr>
              </thead>
              <tbody>
                {cacData.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>{c.sourceId}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{c.totalCost.toLocaleString()}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{c.converted}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{c.cac != null ? c.cac.toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Forecast */}
      {forecast && (
        <>
          <h2 style={{ marginBottom: '0.5rem' }}>Прогноз</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={cardStyle}><div style={labelStyle}>Weighted Pipeline</div><div style={metricStyle}>{forecast.weightedPipelineValue.toLocaleString()}</div></div>
            <div style={cardStyle}><div style={labelStyle}>Open Deals</div><div style={metricStyle}>{forecast.openDealCount}</div></div>
            <div style={cardStyle}><div style={labelStyle}>Renewals (90д)</div><div style={metricStyle}>{forecast.upcomingRenewals}</div></div>
            <div style={cardStyle}><div style={labelStyle}>Renewal MRR</div><div style={metricStyle}>{forecast.renewalMrr.toLocaleString()}</div></div>
            <div style={cardStyle}><div style={labelStyle}>Forecast MRR</div><div style={metricStyle}>{forecast.forecastMrr.toLocaleString()}</div></div>
          </div>
        </>
      )}
    </div>
  );
}
