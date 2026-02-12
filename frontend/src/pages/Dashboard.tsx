import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

type DashboardMetrics = {
  totalLeads: number;
  newLeadsThisMonth: number;
  openDeals: number;
  pipelineValue: number;
  activeSubscriptions: number;
  mrr: number;
  arr: number;
};

export default function Dashboard() {
  const { api } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api('/analytics/dashboard');
        if (res.ok && !cancelled) setMetrics(await res.json());
      } catch {
        // Dashboard should still render even if analytics fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api]);

  const cardStyle: React.CSSProperties = {
    background: '#fff', borderRadius: 8, padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)', flex: '1 1 180px', minWidth: 160,
  };
  const metricStyle: React.CSSProperties = { fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' };
  const labelStyle: React.CSSProperties = { fontSize: '0.85rem', color: '#64748b', marginBottom: 4 };
  const linkCardStyle: React.CSSProperties = {
    padding: '1rem 1.5rem', background: '#fff', borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)', fontWeight: 500, color: '#1a1a1a',
    textDecoration: 'none',
  };

  return (
    <div>
      <h1 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Дашборд</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
        Delever Revenue OS — обзор ключевых метрик
      </p>

      {/* KPI Metrics */}
      {loading ? (
        <div style={{ color: '#64748b', marginBottom: '2rem' }}>Загрузка метрик...</div>
      ) : metrics ? (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <div style={cardStyle}>
            <div style={labelStyle}>MRR</div>
            <div style={metricStyle}>{Number(metrics.mrr).toLocaleString()}</div>
          </div>
          <div style={cardStyle}>
            <div style={labelStyle}>ARR</div>
            <div style={metricStyle}>{Number(metrics.arr).toLocaleString()}</div>
          </div>
          <div style={cardStyle}>
            <div style={labelStyle}>Открытые сделки</div>
            <div style={metricStyle}>{metrics.openDeals}</div>
          </div>
          <div style={cardStyle}>
            <div style={labelStyle}>Pipeline Value</div>
            <div style={metricStyle}>{Number(metrics.pipelineValue).toLocaleString()}</div>
          </div>
          <div style={cardStyle}>
            <div style={labelStyle}>Лиды (месяц)</div>
            <div style={metricStyle}>{metrics.newLeadsThisMonth}</div>
          </div>
          <div style={cardStyle}>
            <div style={labelStyle}>Активные подписки</div>
            <div style={metricStyle}>{metrics.activeSubscriptions}</div>
          </div>
        </div>
      ) : null}

      {/* Quick navigation */}
      <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: '#334155' }}>Быстрый доступ</h2>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link to="/leads" style={linkCardStyle}>Лиды</Link>
        <Link to="/deals" style={linkCardStyle}>Сделки</Link>
        <Link to="/companies" style={linkCardStyle}>Компании</Link>
        <Link to="/tasks" style={linkCardStyle}>Задачи</Link>
        <Link to="/contracts" style={linkCardStyle}>Контракты</Link>
        <Link to="/subscriptions" style={linkCardStyle}>Подписки</Link>
        <Link to="/invoices" style={linkCardStyle}>Счета</Link>
        <Link to="/analytics" style={linkCardStyle}>Аналитика</Link>
        <Link to="/commissions" style={linkCardStyle}>Комиссии</Link>
      </div>
    </div>
  );
}
