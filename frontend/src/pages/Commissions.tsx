import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';

type Accrual = {
  id: string;
  amount: number;
  status: string;
  accrualType?: string;
  periodStart: string;
  periodEnd: string;
  salesRep?: { name: string } | null;
  commissionPlan?: { name: string; type: string } | null;
  deal?: { id: string; outcome: string; amount?: number } | null;
  subscription?: { id: string; mrr: number } | null;
  currency?: { code: string } | null;
  createdAt: string;
};

type PayoutData = {
  id: string;
  amount: number;
  status: string;
  paidAt: string;
  salesRep?: { name: string } | null;
  currency?: { code: string } | null;
};

export default function Commissions() {
  const { api } = useAuth();
  const [accruals, setAccruals] = useState<Accrual[]>([]);
  const [payouts, setPayouts] = useState<PayoutData[]>([]);
  const [totalAccruals, setTotalAccruals] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'accruals' | 'payouts'>('accruals');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [accRes, payRes] = await Promise.all([
          api('/commissions/accruals?limit=50&offset=0'),
          api('/commissions/payouts?limit=50&offset=0'),
        ]);
        if (!cancelled) {
          if (accRes.ok) { const d = await accRes.json(); setAccruals(d.items ?? []); setTotalAccruals(d.total ?? 0); }
          if (payRes.ok) { const d = await payRes.json(); setPayouts(d.items ?? []); }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api]);

  if (loading) return <div>Загрузка комиссий...</div>;
  if (error) return <div style={{ color: '#b91c1c' }}>{error}</div>;

  const totalAmount = accruals.reduce((s, a) => s + Number(a.amount), 0);

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem' }}>Комиссии</h1>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ background: '#fff', borderRadius: 8, padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', minWidth: 180 }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Начислено</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{totalAmount.toLocaleString()}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 8, padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', minWidth: 180 }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Записей</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{totalAccruals}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {(['accruals', 'payouts'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '0.4rem 0.8rem', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: tab === t ? '#2563eb' : '#e2e8f0',
              color: tab === t ? '#fff' : '#334155',
              fontWeight: tab === t ? 600 : 400,
            }}
          >
            {t === 'accruals' ? 'Начисления' : 'Выплаты'}
          </button>
        ))}
      </div>

      {tab === 'accruals' && (
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Продавец</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>План</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Тип</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Сумма</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Статус</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Период</th>
              </tr>
            </thead>
            <tbody>
              {accruals.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>{a.salesRep?.name ?? '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{a.commissionPlan?.name ?? '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{a.accrualType ?? '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{Number(a.amount).toLocaleString()} {a.currency?.code ?? ''}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                      background: a.status === 'paid' ? '#dcfce7' : a.status === 'approved' ? '#dbeafe' : '#fef3c7',
                      color: a.status === 'paid' ? '#166534' : a.status === 'approved' ? '#1e40af' : '#92400e',
                    }}>{a.status}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {new Date(a.periodStart).toLocaleDateString('ru')} — {new Date(a.periodEnd).toLocaleDateString('ru')}
                  </td>
                </tr>
              ))}
              {accruals.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Нет начислений.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'payouts' && (
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Продавец</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Сумма</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Статус</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Дата</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>{p.salesRep?.name ?? '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{Number(p.amount).toLocaleString()} {p.currency?.code ?? ''}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{p.status}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{new Date(p.paidAt).toLocaleDateString('ru')}</td>
                </tr>
              ))}
              {payouts.length === 0 && (
                <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Нет выплат.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
