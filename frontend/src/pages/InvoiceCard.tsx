import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

type PaymentData = {
  id: string;
  amount: number;
  paidAt: string;
  method?: string;
  gatewayFee?: number;
  currency?: { code: string } | null;
};

type InvoiceData = {
  id: string;
  amount: number;
  status: string;
  dueDate?: string;
  paidAt?: string;
  currency?: { code: string; symbol?: string } | null;
  subscription?: { id: string; product?: { name: string } | null } | null;
  contract?: { id: string; company?: { name: string; id: string } | null } | null;
  payments?: PaymentData[];
  createdAt: string;
};

export default function InvoiceCard() {
  const { id } = useParams<{ id: string }>();
  const { api } = useAuth();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api(`/invoices/${id}`);
        if (!res.ok) throw new Error('Ошибка загрузки');
        const data = await res.json();
        if (!cancelled) setInvoice(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, id]);

  if (loading) return <div>Загрузка счёта...</div>;
  if (error) return <div style={{ color: '#b91c1c' }}>{error}</div>;
  if (!invoice) return <div>Счёт не найден</div>;

  const totalPaid = (invoice.payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Number(invoice.amount) - totalPaid;

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem' }}>Счёт</h1>
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div><strong>Компания:</strong>{' '}
          {invoice.contract?.company ? <Link to={`/companies/${invoice.contract.company.id}`}>{invoice.contract.company.name}</Link> : '—'}
        </div>
        <div><strong>Контракт:</strong>{' '}
          {invoice.contract ? <Link to={`/contracts/${invoice.contract.id}`}>{invoice.contract.id.slice(0, 8)}</Link> : '—'}
        </div>
        {invoice.subscription && (
          <div><strong>Подписка:</strong>{' '}
            <Link to={`/subscriptions/${invoice.subscription.id}`}>{invoice.subscription.product?.name ?? invoice.subscription.id.slice(0, 8)}</Link>
          </div>
        )}
        <div><strong>Сумма:</strong> {Number(invoice.amount).toLocaleString()} {invoice.currency?.code ?? ''}</div>
        <div><strong>Статус:</strong> {invoice.status}</div>
        <div><strong>Срок оплаты:</strong> {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('ru') : '—'}</div>
        {invoice.paidAt && <div><strong>Оплачен:</strong> {new Date(invoice.paidAt).toLocaleDateString('ru')}</div>}
      </div>

      {remaining > 0 && invoice.status !== 'paid' && (
        <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: 8, color: '#92400e', marginBottom: '1rem' }}>
          Остаток к оплате: {remaining.toLocaleString()} {invoice.currency?.code ?? ''}
        </div>
      )}

      <h2 style={{ marginBottom: '0.5rem' }}>Платежи</h2>
      {(!invoice.payments || invoice.payments.length === 0) ? (
        <p style={{ color: '#64748b' }}>Нет платежей. Зарегистрируйте платёж через API POST /invoices/{invoice.id}/payments.</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Сумма</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Дата</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Способ</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Комиссия</th>
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>{Number(p.amount).toLocaleString()} {p.currency?.code ?? ''}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{new Date(p.paidAt).toLocaleDateString('ru')}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{p.method ?? '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{p.gatewayFee ? Number(p.gatewayFee).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
