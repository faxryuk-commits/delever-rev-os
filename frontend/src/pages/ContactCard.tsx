import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

type Contact = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  company?: { id: string; name: string } | null;
};

export default function ContactCard() {
  const { id } = useParams<{ id: string }>();
  const { api } = useAuth();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await api(`/contacts/${id}`);
        if (!res.ok) throw new Error('Контакт не найден');
        setContact(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, api]);

  if (loading) return <div>Загрузка...</div>;
  if (error || !contact) return <div style={{ color: '#b91c1c' }}>{error || 'Не найдено'}</div>;

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        {contact.company?.id ? (
          <Link to={`/companies/${contact.company.id}`} style={{ color: '#64748b', fontSize: 14 }}>← {contact.company.name}</Link>
        ) : (
          <Link to="/companies" style={{ color: '#64748b', fontSize: 14 }}>← Компании</Link>
        )}
      </div>
      <h1 style={{ marginTop: 0 }}>{contact.name}</h1>
      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '1.5rem' }}>
        <dl style={{ margin: 0, display: 'grid', gap: '0.5rem' }}>
          <div><dt style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Email</dt><dd style={{ margin: 0 }}>{contact.email ?? '—'}</dd></div>
          <div><dt style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Телефон</dt><dd style={{ margin: 0 }}>{contact.phone ?? '—'}</dd></div>
          <div><dt style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Должность</dt><dd style={{ margin: 0 }}>{contact.position ?? '—'}</dd></div>
          <div><dt style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Компания</dt><dd style={{ margin: 0 }}>{contact.company ? <Link to={`/companies/${contact.company.id}`}>{contact.company.name}</Link> : '—'}</dd></div>
        </dl>
      </div>
    </div>
  );
}
