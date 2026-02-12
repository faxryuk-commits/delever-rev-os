import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

type Deal = {
  id: string;
  amount?: number | null;
  outcome: string;
  expectedCloseAt?: string | null;
  closedAt?: string | null;
  company?: { id: string; name: string } | null;
  contact?: { name: string } | null;
  pipeline?: { id: string; name: string } | null;
  pipelineStage?: { id: string; name: string; isWon: boolean; isLost: boolean } | null;
  pipelineStages?: { id: string; name: string; isWon: boolean; isLost: boolean; sortOrder: number }[];
  salesRep?: { name: string } | null;
  lead?: { id: string } | null;
  createdAt: string;
};

export default function DealCard() {
  const { id } = useParams<{ id: string }>();
  const { api } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [pipelines, setPipelines] = useState<{ id: string; stages: { id: string; name: string; isWon: boolean; isLost: boolean }[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [moving, setMoving] = useState(false);
  const [stageId, setStageId] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [r1, r2] = await Promise.all([api(`/deals/${id}`), api('/settings/pipelines')]);
        if (!r1.ok) throw new Error('Сделка не найдена');
        const d = await r1.json();
        setDeal(d);
        if (d.pipeline?.id) setStageId(d.pipelineStage?.id ?? '');
        if (r2.ok) {
          const p = await r2.json();
          setPipelines(p.items ?? []);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, api]);

  const currentPipeline = deal?.pipeline?.id ? pipelines.find((p) => p.id === deal.pipeline!.id) : null;
  const stages = currentPipeline?.stages ?? [];

  const handleMoveStage = async () => {
    if (!id || !stageId || stageId === deal?.pipelineStage?.id) return;
    setMoving(true);
    setError('');
    try {
      const res = await api(`/deals/${id}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stage_id: stageId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Ошибка');
      }
      const updated = await res.json();
      setDeal(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setMoving(false);
    }
  };

  if (loading) return <div>Загрузка...</div>;
  if (error && !deal) return <div style={{ color: '#b91c1c' }}>{error}</div>;
  if (!deal) return null;

  const nextStepHint =
    deal.outcome === 'won'
      ? 'Сделка выиграна. Следующий шаг: создать контракт (раздел Контракты).'
      : deal.outcome === 'lost'
        ? 'Сделка проиграна.'
        : 'Следующий шаг: перейти в стадию (выберите стадию ниже) или добавить активность/задачу.';

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/deals" style={{ color: '#64748b', fontSize: 14 }}>← Сделки</Link>
      </div>
      <h1 style={{ marginTop: 0 }}>{deal.company?.name ?? 'Сделка'}</h1>
      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem' }}>
        <strong>Следующий шаг:</strong> {nextStepHint}
      </div>
      {error && <div style={{ color: '#b91c1c', marginBottom: '1rem' }}>{error}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '1.5rem', flex: '1 1 300px' }}>
          <h3 style={{ marginTop: 0 }}>Данные</h3>
          <dl style={{ margin: 0, display: 'grid', gap: '0.5rem' }}>
            <div><dt style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Воронка / Стадия</dt><dd style={{ margin: 0 }}>{deal.pipeline?.name} / {deal.pipelineStage?.name}</dd></div>
            <div><dt style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Сумма</dt><dd style={{ margin: 0 }}>{deal.amount != null ? Number(deal.amount).toLocaleString() : '—'}</dd></div>
            <div><dt style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Исход</dt><dd style={{ margin: 0 }}>{deal.outcome}</dd></div>
            <div><dt style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Компания</dt><dd style={{ margin: 0 }}><Link to={`/companies/${deal.company?.id}`}>{deal.company?.name}</Link></dd></div>
            <div><dt style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Контакт</dt><dd style={{ margin: 0 }}>{deal.contact?.name ?? '—'}</dd></div>
            <div><dt style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Ответственный</dt><dd style={{ margin: 0 }}>{deal.salesRep?.name ?? '—'}</dd></div>
          </dl>
        </div>
        {deal.outcome === 'open' && stages.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '1.5rem', flex: '1 1 260px' }}>
            <h3 style={{ marginTop: 0 }}>Перейти в стадию</h3>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: '0.75rem' }}>Менять стадию только отсюда (не в общем редактировании).</p>
            <select
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #ccc', borderRadius: 4 }}
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleMoveStage}
              disabled={moving || stageId === deal.pipelineStage?.id}
              style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6 }}
            >
              {moving ? 'Сохранение...' : 'Перейти'}
            </button>
          </div>
        )}
      </div>
      <div style={{ marginTop: '1.5rem' }}>
        <h3>Активности</h3>
        <p style={{ fontSize: 14, color: '#64748b' }}>Добавление активностей и задач — в следующих версиях с этой страницы.</p>
      </div>
    </div>
  );
}
