import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

type Invoice = {
  id: string;
  amount: number;
  status: string;
  dueDate?: string;
  paidAt?: string;
  currency?: { code: string } | null;
  subscription?: { product?: { name: string } | null } | null;
  contract?: { company?: { name: string } | null } | null;
  createdAt: string;
};

export default function InvoiceList() {
  const { api } = useAuth();
  const [items, setItems] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let url = '/invoices?limit=50&offset=0';
        if (statusFilter) url += `&status=${statusFilter}`;
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
  }, [api, statusFilter]);

  if (error) return <div style={{ color: '#b91c1c' }}>{error}</div>;

  const statusColors: Record<string, { bg: string; color: string }> = {
    draft: { bg: '#e2e8f0', color: '#475569' },
    sent: { bg: '#dbeafe', color: '#1e40af' },
    paid: { bg: '#dcfce7', color: '#166534' },
    overdue: { bg: '#fee2e2', color: '#991b1b' },
  };

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem' }}>Счета</h1>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {['', 'draft', 'sent', 'paid', 'overdue'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '0.4rem 0.8rem', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: statusFilter === s ? '#2563eb' : '#e2e8f0',
              color: statusFilter === s ? '#fff' : '#334155',
              fontWeight: statusFilter === s ? 600 : 400,
            }}
          >
            {s === '' ? 'Все' : s}
          </button>
        ))}
      </div>
      <p style={{ color: '#64748b', marginBottom: '1rem' }}>Всего: {total}</p>
      {loading ? <div>Загрузка...</div> : (
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Компания</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Продукт</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Сумма</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Статус</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Срок</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Дата</th>
                <th style={{ padding: '0.75rem 1rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((inv) => {
                const sc = statusColors[inv.status] || { bg: '#e2e8f0', color: '#475569' };
                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>{inv.contract?.company?.name ?? '—'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{inv.subscription?.product?.name ?? '—'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{Number(inv.amount).toLocaleString()} {inv.currency?.code ?? ''}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, background: sc.bg, color: sc.color }}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('ru') : '—'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{new Date(inv.createdAt).toLocaleDateString('ru')}</td>
                    <td style={{ padding: '0.75rem 1rem' }}><Link to={`/invoices/${inv.id}`}>Открыть</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {items.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Нет счетов.</div>
          )}
        </div>
      )}
    </div>
  );
}
