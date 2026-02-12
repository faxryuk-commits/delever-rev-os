import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Дашборд</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
        Главный обзор. Аналитика и метрики будут в следующих версиях.
      </p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link
          to="/leads"
          style={{
            padding: '1rem 1.5rem',
            background: '#fff',
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            fontWeight: 500,
            color: '#1a1a1a',
          }}
        >
          Лиды
        </Link>
        <Link
          to="/deals"
          style={{
            padding: '1rem 1.5rem',
            background: '#fff',
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            fontWeight: 500,
            color: '#1a1a1a',
          }}
        >
          Сделки
        </Link>
        <Link
          to="/companies"
          style={{
            padding: '1rem 1.5rem',
            background: '#fff',
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            fontWeight: 500,
            color: '#1a1a1a',
          }}
        >
          Компании
        </Link>
        <Link
          to="/tasks"
          style={{
            padding: '1rem 1.5rem',
            background: '#fff',
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            fontWeight: 500,
            color: '#1a1a1a',
          }}
        >
          Мои задачи
        </Link>
      </div>
    </div>
  );
}
