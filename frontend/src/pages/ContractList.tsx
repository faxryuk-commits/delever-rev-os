import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

type Contract = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  lengthMonths?: number;
  company?: { name: string } | null;
  territory?: { name: string } | null;
  currency?: { code: string } | null;
  deal?: { id: string; outcome: string } | null;
  createdAt: string;
};

export default function ContractList() {
  const { api } = useAuth();
  const [items, setItems] = useState<Contract[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api('/contracts?limit=50&offset=0');
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
  }, [api]);

  if (loading) return <div>Загрузка контрактов...</div>;
  if (error) return <div style={{ color: '#b91c1c' }}>{error}</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '1rem' }}>Контракты</h1>
      <p style={{ color: '#64748b', marginBottom: '1rem' }}>Всего: {total}</p>
      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Компания</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Территория</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Статус</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Начало</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Конец</th>
              <th style={{ padding: '0.75rem 1rem' }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 1rem' }}>{c.company?.name ?? '—'}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{c.territory?.name ?? '—'}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                    background: c.status === 'active' ? '#dcfce7' : c.status === 'draft' ? '#fef3c7' : '#fee2e2',
                    color: c.status === 'active' ? '#166534' : c.status === 'draft' ? '#92400e' : '#991b1b',
                  }}>{c.status}</span>
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>{new Date(c.startDate).toLocaleDateString('ru')}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{new Date(c.endDate).toLocaleDateString('ru')}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <Link to={`/contracts/${c.id}`}>Открыть</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            Нет контрактов. Создайте контракт из карточки сделки после её закрытия (Won).
          </div>
        )}
      </div>
    </div>
  );
}
