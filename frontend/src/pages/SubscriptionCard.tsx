import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

type InvoiceData = {
  id: string;
  amount: number;
  status: string;
  dueDate?: string;
  paidAt?: string;
  currency?: { code: string } | null;
  payments?: { id: string; amount: number; paidAt: string }[];
};

type SubData = {
  id: string;
  mrr: number;
  arr: number;
  billingCycle: string;
  renewalDate: string;
  status: string;
  churnRisk?: string;
  product?: { name: string } | null;
  contract?: {
    id: string;
    company?: { name: string; id: string } | null;
    territory?: { name: string } | null;
    currency?: { code: string; symbol?: string } | null;
  } | null;
};

export default function SubscriptionCard() {
  const { id } = useParams<{ id: string }>();
  const { api } = useAuth();
  const [sub, setSub] = useState<SubData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [subRes, invRes] = await Promise.all([
          api(`/subscriptions/${id}`),
          api(`/subscriptions/${id}/invoices`),
        ]);
        if (!subRes.ok) throw new Error('Ошибка загрузки подписки');
        const subData = await subRes.json();
        const invData = invRes.ok ? await invRes.json() : { items: [] };
        if (!cancelled) { setSub(subData); setInvoices(invData.items ?? []); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, id]);

  if (loading) return <div>Загрузка подписки...</div>;
  if (error) return <div style={{ color: '#b91c1c' }}>{error}</div>;
  if (!sub) return <div>Подписка не найдена</div>;

  const daysToRenewal = Math.ceil((new Date(sub.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem' }}>Подписка: {sub.product?.name ?? '—'}</h1>
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div><strong>Компания:</strong>{' '}
          {sub.contract?.company ? <Link to={`/companies/${sub.contract.company.id}`}>{sub.contract.company.name}</Link> : '—'}
        </div>
        <div><strong>Контракт:</strong>{' '}
          {sub.contract ? <Link to={`/contracts/${sub.contract.id}`}>{sub.contract.id.slice(0, 8)}</Link> : '—'}
        </div>
        <div><strong>Статус:</strong> {sub.status}</div>
        <div><strong>MRR:</strong> {Number(sub.mrr).toLocaleString()} {sub.contract?.currency?.code ?? ''}</div>
        <div><strong>ARR:</strong> {Number(sub.arr).toLocaleString()} {sub.contract?.currency?.code ?? ''}</div>
        <div><strong>Цикл:</strong> {sub.billingCycle}</div>
        <div><strong>Продление:</strong> {new Date(sub.renewalDate).toLocaleDateString('ru')} ({daysToRenewal}д)</div>
        {sub.churnRisk && <div><strong>Риск оттока:</strong> {sub.churnRisk}</div>}
      </div>

      {daysToRenewal <= 30 && daysToRenewal > 0 && (
        <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: 8, color: '#92400e', marginBottom: '1rem' }}>
          Продление через {daysToRenewal} дней. Подготовьте предложение по продлению или расширению.
        </div>
      )}

      <h2 style={{ marginBottom: '0.5rem' }}>Счета</h2>
      {invoices.length === 0 ? (
        <p style={{ color: '#64748b' }}>Нет счетов для этой подписки.</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Сумма</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Статус</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Срок оплаты</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Оплачен</th>
                <th style={{ padding: '0.75rem 1rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>{Number(inv.amount).toLocaleString()} {inv.currency?.code ?? ''}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{inv.status}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('ru') : '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('ru') : '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <Link to={`/invoices/${inv.id}`}>Открыть</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
