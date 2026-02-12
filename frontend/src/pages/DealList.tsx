import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

type Deal = {
  id: string;
  amount?: number | null;
  outcome: string;
  company?: { name: string } | null;
  contact?: { name: string } | null;
  pipeline?: { name: string } | null;
  pipelineStage?: { name: string } | null;
  salesRep?: { name: string } | null;
  expectedCloseAt?: string | null;
  createdAt: string;
};

export default function DealList() {
  const { api } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [pipelines, setPipelines] = useState<{ id: string; name: string; stages: { id: string; name: string }[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterPipeline, setFilterPipeline] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [r1, r2] = await Promise.all([
          api('/deals?limit=100&offset=0'),
          api('/settings/pipelines'),
        ]);
        if (!r1.ok) throw new Error('Ошибка загрузки сделок');
        const d = await r1.json();
        setDeals(d.items ?? []);
        if (r2.ok) {
          const p = await r2.json();
          setPipelines(p.items ?? []);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка');
      } finally {
        setLoading(false);
      }
    })();
  }, [api]);

  const filtered = filterPipeline ? deals.filter((d) => d.pipeline?.name && pipelines.find((p) => p.id === filterPipeline)?.name === d.pipeline?.name) : deals;

  if (loading) return <div>Загрузка сделок...</div>;
  if (error) return <div style={{ color: '#b91c1c' }}>{error}</div>;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Сделки</h1>
      <p style={{ color: '#64748b', marginBottom: '1rem' }}>
        Следующий шаг: открыть сделку → перейти в стадию (Won/Lost) или добавить активность/задачу.
      </p>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ marginRight: 8 }}>Воронка:</label>
        <select
          value={filterPipeline}
          onChange={(e) => setFilterPipeline(e.target.value)}
          style={{ padding: '0.35rem 0.5rem', border: '1px solid #ccc', borderRadius: 4 }}
        >
          <option value="">Все</option>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Компания</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Воронка / Стадия</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Сумма</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Исход</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Ответственный</th>
              <th style={{ padding: '0.75rem 1rem' }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((deal) => (
              <tr key={deal.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 1rem' }}>{deal.company?.name ?? '—'}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{deal.pipeline?.name ?? '—'} / {deal.pipelineStage?.name ?? '—'}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{deal.amount != null ? Number(deal.amount).toLocaleString() : '—'}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{deal.outcome}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{deal.salesRep?.name ?? '—'}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <Link to={`/deals/${deal.id}`}>Открыть</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            Нет сделок. Конвертируйте лид в сделку из карточки лида.
          </div>
        )}
      </div>
    </div>
  );
}
