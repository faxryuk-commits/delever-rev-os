import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Layout({ children }: { children?: React.ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: 220,
          background: '#1e293b',
          color: '#e2e8f0',
          padding: '1rem 0',
        }}
      >
        <div style={{ padding: '0 1rem', marginBottom: '1.5rem', fontWeight: 700, fontSize: '1.1rem' }}>
          Delever RevOS
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <Link to="/" style={{ color: '#e2e8f0', padding: '0.5rem 1rem' }}>Дашборд</Link>
          <Link to="/leads" style={{ color: '#e2e8f0', padding: '0.5rem 1rem' }}>Лиды</Link>
          <Link to="/deals" style={{ color: '#e2e8f0', padding: '0.5rem 1rem' }}>Сделки</Link>
          <Link to="/companies" style={{ color: '#e2e8f0', padding: '0.5rem 1rem' }}>Компании</Link>
          <Link to="/tasks" style={{ color: '#e2e8f0', padding: '0.5rem 1rem' }}>Задачи</Link>
          <Link to="/settings" style={{ color: '#94a3b8', padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Настройки</Link>
        </nav>
        <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', right: '1rem' }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid #64748b',
              color: '#94a3b8',
              padding: '0.5rem',
              borderRadius: 6,
              width: '100%',
            }}
          >
            Выйти
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: '1.5rem', overflow: 'auto' }}>
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
