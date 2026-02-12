import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

type Task = {
  id: string;
  title: string;
  status: string;
  dueAt?: string | null;
  priority?: string | null;
  deal?: { id: string; company?: { name: string } } | null;
  lead?: { id: string } | null;
  assignedTo?: { name: string } | null;
};

export default function TaskList() {
  const { api } = useAuth();
  const [items, setItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api('/tasks?limit=50&offset=0');
        if (!res.ok) throw new Error('Ошибка загрузки');
        const data = await res.json();
        setItems(data.items ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка');
      } finally {
        setLoading(false);
      }
    })();
  }, [api]);

  if (loading) return <div>Загрузка задач...</div>;
  if (error) return <div style={{ color: '#b91c1c' }}>{error}</div>;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Мои задачи</h1>
      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Задача</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Статус</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Срок</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Сделка</th>
              <th style={{ padding: '0.75rem 1rem' }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 1rem' }}>{t.title}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{t.status}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{t.dueAt ? new Date(t.dueAt).toLocaleDateString('ru') : '—'}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  {t.deal ? <Link to={`/deals/${t.deal.id}`}>{t.deal.company?.name ?? 'Сделка'}</Link> : '—'}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}></td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Нет задач</div>}
      </div>
    </div>
  );
}
