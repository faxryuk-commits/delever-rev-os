import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

type Source = { id: string; name: string };
type Territory = { id: string; name: string };

export default function LeadNew() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [sources, setSources] = useState<Source[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    source_id: '',
    territory_id: '',
    channel: '',
    status: 'new',
  });

  useEffect(() => {
    (async () => {
      const [r1, r2] = await Promise.all([api('/settings/sources'), api('/settings/territories')]);
      if (r1.ok) {
        const d = await r1.json();
        setSources(d.items ?? []);
      }
      if (r2.ok) {
        const d = await r2.json();
        setTerritories(d.items ?? []);
      }
    })();
  }, [api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api('/leads', {
        method: 'POST',
        body: JSON.stringify({
          company_name: form.company_name,
          contact_name: form.contact_name,
          contact_email: form.contact_email,
          source_id: form.source_id || undefined,
          territory_id: form.territory_id || undefined,
          channel: form.channel || undefined,
          status: form.status,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Ошибка создания');
      }
      const lead = await res.json();
      navigate(`/leads/${lead.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Новый лид</h1>
      <p style={{ color: '#64748b', marginBottom: '1rem' }}>
        Укажите источник и кампанию для расчёта CAC. После сохранения: квалифицируйте или конвертируйте в сделку.
      </p>
      <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Компания *</label>
          <input
            required
            value={form.company_name}
            onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: 4 }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Контакт (имя)</label>
          <input
            value={form.contact_name}
            onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: 4 }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Email контакта</label>
          <input
            type="email"
            value={form.contact_email}
            onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: 4 }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Источник</label>
          <select
            value={form.source_id}
            onChange={(e) => setForm((f) => ({ ...f, source_id: e.target.value }))}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: 4 }}
          >
            <option value="">—</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Территория</label>
          <select
            value={form.territory_id}
            onChange={(e) => setForm((f) => ({ ...f, territory_id: e.target.value }))}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: 4 }}
          >
            <option value="">—</option>
            {territories.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Канал</label>
          <input
            value={form.channel}
            onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
            placeholder="web, telegram, ..."
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: 4 }}
          />
        </div>
        {error && <div style={{ color: '#b91c1c', marginBottom: '1rem' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" disabled={loading} style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6 }}>
            {loading ? 'Сохранение...' : 'Создать лид'}
          </button>
          <button type="button" onClick={() => navigate(-1)} style={{ padding: '0.5rem 1rem', background: '#e2e8f0', border: 'none', borderRadius: 6 }}>
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}
