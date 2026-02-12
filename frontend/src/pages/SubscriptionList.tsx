import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

type Subscription = {
  id: string;
  mrr: number;
  arr: number;
  billingCycle: string;
  renewalDate: string;
  status: string;
  product?: { name: string } | null;
  contract?: { company?: { name: string } | null } | null;
};

export default function SubscriptionList() {
  const { api } = useAuth();
  const [items, setItems] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'renewal'>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let url = '/subscriptions?limit=50&offset=0';
        if (filter === 'active') url += '&status=active';
        if (filter === 'renewal') {
          const now = new Date();
          const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          url += `&status=active&renewal_from=${now.toISOString()}&renewal_to=${in30.toISOString()}`;
        }
        const res = await api(url);
        if (!res.ok) throw new Error('Ошибка загрузки');
        const data = await res.json();
        if (!cancelled) { setItems(data.items ?? []); setTotal(data.total ?? 0); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, filter]);

  if (error) return <div style={{ color: '#b91c1c' }}>{error}</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem' }}>Подписки</h1>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {(['all', 'active', 'renewal'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '0.4rem 0.8rem', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: filter === f ? '#2563eb' : '#e2e8f0',
              color: filter === f ? '#fff' : '#334155',
              fontWeight: filter === f ? 600 : 400,
            }}
          >
            {f === 'all' ? 'Все' : f === 'active' ? 'Активные' : 'На продление (30д)'}
          </button>
        ))}
      </div>
      <p style={{ color: '#64748b', marginBottom: '1rem' }}>Всего: {total}</p>
      {loading ? <div>Загрузка...</div> : (
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Продукт</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Компания</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>MRR</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>ARR</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Цикл</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Продление</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Статус</th>
                <th style={{ padding: '0.75rem 1rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>{s.product?.name ?? '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{s.contract?.company?.name ?? '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{Number(s.mrr).toLocaleString()}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{Number(s.arr).toLocaleString()}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{s.billingCycle}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{new Date(s.renewalDate).toLocaleDateString('ru')}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                      background: s.status === 'active' ? '#dcfce7' : s.status === 'past_due' ? '#fef3c7' : '#fee2e2',
                      color: s.status === 'active' ? '#166534' : s.status === 'past_due' ? '#92400e' : '#991b1b',
                    }}>{s.status}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <Link to={`/subscriptions/${s.id}`}>Открыть</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              Нет подписок{filter === 'renewal' ? ' на продление в ближайшие 30 дней' : ''}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
