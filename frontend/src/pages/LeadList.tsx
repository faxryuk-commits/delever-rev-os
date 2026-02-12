import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

type Lead = {
  id: string;
  status: string;
  score?: number;
  company?: { name: string } | null;
  contact?: { name: string; email?: string } | null;
  source?: { name: string } | null;
  campaign?: { name: string } | null;
  territory?: { name: string } | null;
  assignedTo?: { name: string } | null;
  createdAt: string;
};

export default function LeadList() {
  const { api } = useAuth();
  const [items, setItems] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api('/leads?limit=50&offset=0');
        if (!res.ok) throw new Error('Ошибка загрузки');
        const data = await res.json();
        if (!cancelled) {
          setItems(data.items ?? []);
          setTotal(data.total ?? 0);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api]);

  if (loading) return <div>Загрузка лидов...</div>;
  if (error) return <div style={{ color: '#b91c1c' }}>{error}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Лиды</h1>
        <Link
          to="/leads/new"
          style={{
            padding: '0.5rem 1rem',
            background: '#2563eb',
            color: '#fff',
            borderRadius: 6,
            fontWeight: 500,
          }}
        >
          Добавить лид
        </Link>
      </div>
      <p style={{ color: '#64748b', marginBottom: '1rem' }}>
        Всего: {total}. Следующий шаг: открыть лид → квалифицировать или конвертировать в сделку.
      </p>
      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Компания / Контакт</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Источник</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Статус</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Ответственный</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Дата</th>
              <th style={{ padding: '0.75rem 1rem' }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((lead) => (
              <tr key={lead.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div>{lead.company?.name ?? '—'}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{lead.contact?.name ?? lead.contact?.email ?? '—'}</div>
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>{lead.source?.name ?? '—'}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{lead.status}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{lead.assignedTo?.name ?? '—'}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{new Date(lead.createdAt).toLocaleDateString('ru')}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <Link to={`/leads/${lead.id}`}>Открыть</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            Нет лидов. <Link to="/leads/new">Добавить лид</Link> или настройте приём с сайта (webhook).
          </div>
        )}
      </div>
    </div>
  );
}
