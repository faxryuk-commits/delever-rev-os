import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const navItems = [
  { to: '/', label: 'Дашборд' },
  { to: '/leads', label: 'Лиды' },
  { to: '/deals', label: 'Сделки' },
  { to: '/companies', label: 'Компании' },
  { to: '/tasks', label: 'Задачи' },
  { to: '/contracts', label: 'Контракты' },
  { to: '/subscriptions', label: 'Подписки' },
  { to: '/invoices', label: 'Счета' },
  { to: '/analytics', label: 'Аналитика' },
  { to: '/commissions', label: 'Комиссии' },
];

export default function Layout({ children }: { children?: React.ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: 220,
          background: '#1e293b',
          color: '#e2e8f0',
          padding: '1rem 0',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '0 1rem', marginBottom: '1.5rem', fontWeight: 700, fontSize: '1.1rem' }}>
          Delever RevOS
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              style={{
                color: isActive(item.to) ? '#fff' : '#e2e8f0',
                padding: '0.5rem 1rem',
                background: isActive(item.to) ? '#334155' : 'transparent',
                borderRadius: 4,
                margin: '0 0.5rem',
                textDecoration: 'none',
                fontWeight: isActive(item.to) ? 600 : 400,
              }}
            >
              {item.label}
            </Link>
          ))}
          <div style={{ height: 1, background: '#334155', margin: '0.5rem 1rem' }} />
          <Link
            to="/settings"
            style={{
              color: '#94a3b8',
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              margin: '0 0.5rem',
              textDecoration: 'none',
            }}
          >
            Настройки
          </Link>
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
              cursor: 'pointer',
            }}
          >
            Выйти
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: '1.5rem', overflow: 'auto', background: '#f8fafc' }}>
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
