import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

type Company = { id: string; name: string; domain?: string | null; territory?: { name: string } | null };

export default function CompanyList() {
  const { api } = useAuth();
  const [items, setItems] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api('/companies?limit=50&offset=0');
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

  if (loading) return <div>Загрузка компаний...</div>;
  if (error) return <div style={{ color: '#b91c1c' }}>{error}</div>;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Компании</h1>
      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Название</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Домен</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Территория</th>
              <th style={{ padding: '0.75rem 1rem' }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 1rem' }}>{c.name}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{c.domain ?? '—'}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{c.territory?.name ?? '—'}</td>
                <td style={{ padding: '0.75rem 1rem' }}><Link to={`/companies/${c.id}`}>Открыть</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Нет компаний</div>}
      </div>
    </div>
  );
}
