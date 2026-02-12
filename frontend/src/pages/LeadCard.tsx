import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

type Lead = {
  id: string;
  status: string;
  score?: number;
  company?: { id: string; name: string } | null;
  contact?: { id: string; name: string; email?: string } | null;
  source?: { name: string } | null;
  campaign?: { name: string } | null;
  territory?: { name: string } | null;
  assignedTo?: { name: string } | null;
  channel?: string | null;
  cost?: number | null;
  createdAt: string;
  updatedAt: string;
};

export default function LeadCard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { api } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await api(`/leads/${id}`);
        if (!res.ok) throw new Error('Не найден');
        const data = await res.json();
        setLead(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, api]);

  const handleConvert = async () => {
    if (!id) return;
    setConverting(true);
    setError('');
    try {
      const res = await api(`/leads/${id}/convert`, { method: 'POST', body: JSON.stringify({}) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Ошибка конвертации');
      }
      const data = await res.json();
      navigate(`/deals/${data.dealId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setConverting(false);
    }
  };

  if (loading) return <div>Загрузка...</div>;
  if (error || !lead) return <div style={{ color: '#b91c1c' }}>{error || 'Лид не найден'}</div>;

  const canConvert = lead.status !== 'converted' && lead.company?.id;
  const nextStepHint =
    lead.status === 'converted'
      ? 'Лид конвертирован в сделку. Работайте в карточке сделки.'
      : lead.status === 'qualified' && canConvert
        ? 'Следующий шаг: конвертировать в сделку (кнопка ниже).'
        : lead.status === 'new' || lead.status === 'contacted'
          ? 'Следующий шаг: квалифицировать (сменить статус на Qualified) или конвертировать в сделку.'
          : 'Конвертируйте в сделку или отметьте как Lost.';

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/leads" style={{ color: '#64748b', fontSize: 14 }}>← Лиды</Link>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ margin: 0 }}>{lead.company?.name ?? 'Лид'}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {canConvert && (
            <button
              type="button"
              onClick={handleConvert}
              disabled={converting}
              style={{ padding: '0.5rem 1rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 500 }}
            >
              {converting ? 'Создание сделки...' : 'Конвертировать в сделку'}
            </button>
          )}
        </div>
      </div>
      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '0.75rem 1rem', marginTop: '1rem', marginBottom: '1rem' }}>
        <strong>Следующий шаг:</strong> {nextStepHint}
      </div>
      {error && <div style={{ color: '#b91c1c', marginBottom: '1rem' }}>{error}</div>}
      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '1.5rem', maxWidth: 560 }}>
        <dl style={{ margin: 0, display: 'grid', gap: '0.75rem' }}>
          <div><dt style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Статус</dt><dd style={{ margin: 0 }}>{lead.status}</dd></div>
          <div><dt style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Компания</dt><dd style={{ margin: 0 }}>{lead.company?.name ?? '—'}</dd></div>
          <div><dt style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Контакт</dt><dd style={{ margin: 0 }}>{lead.contact?.name ?? lead.contact?.email ?? '—'}</dd></div>
          <div><dt style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Источник</dt><dd style={{ margin: 0 }}>{lead.source?.name ?? '—'}</dd></div>
          <div><dt style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Кампания</dt><dd style={{ margin: 0 }}>{lead.campaign?.name ?? '—'}</dd></div>
          <div><dt style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Территория</dt><dd style={{ margin: 0 }}>{lead.territory?.name ?? '—'}</dd></div>
          <div><dt style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Ответственный</dt><dd style={{ margin: 0 }}>{lead.assignedTo?.name ?? '—'}</dd></div>
          <div><dt style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Создан</dt><dd style={{ margin: 0 }}>{new Date(lead.createdAt).toLocaleString('ru')}</dd></div>
        </dl>
      </div>
    </div>
  );
}
