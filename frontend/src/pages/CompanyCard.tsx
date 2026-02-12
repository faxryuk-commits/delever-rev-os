import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

type Company = {
  id: string;
  name: string;
  domain?: string | null;
  territory?: { name: string } | null;
};
type Contact = { id: string; name: string; email?: string | null; phone?: string | null };

export default function CompanyCard() {
  const { id } = useParams<{ id: string }>();
  const { api } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [r1, r2] = await Promise.all([api(`/companies/${id}`), api(`/companies/${id}/contacts`)]);
        if (!r1.ok) throw new Error('Компания не найдена');
        setCompany(await r1.json());
        if (r2.ok) {
          const d = await r2.json();
          setContacts(d.items ?? []);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, api]);

  if (loading) return <div>Загрузка...</div>;
  if (error || !company) return <div style={{ color: '#b91c1c' }}>{error || 'Не найдено'}</div>;

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}><Link to="/companies" style={{ color: '#64748b', fontSize: 14 }}>← Компании</Link></div>
      <h1 style={{ marginTop: 0 }}>{company.name}</h1>
      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <dl style={{ margin: 0, display: 'grid', gap: '0.5rem' }}>
          <div><dt style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Домен</dt><dd style={{ margin: 0 }}>{company.domain ?? '—'}</dd></div>
          <div><dt style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Территория</dt><dd style={{ margin: 0 }}>{company.territory?.name ?? '—'}</dd></div>
        </dl>
      </div>
      <h3>Контакты</h3>
      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {contacts.length === 0 ? (
          <div style={{ padding: '1.5rem', color: '#64748b' }}>Нет контактов</div>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {contacts.map((c) => (
              <li key={c.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                <Link to={`/contacts/${c.id}`}>{c.name}</Link>
                {c.email && <span style={{ color: '#64748b', marginLeft: 8 }}>{c.email}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
