import { Routes, Route, Link, useLocation } from 'react-router-dom';

export default function Settings() {
  const loc = useLocation();
  const base = '/settings';

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Настройки</h1>
      <nav style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Link to={base} style={{ fontWeight: loc.pathname === base ? 600 : 400 }}>Обзор</Link>
        <Link to={`${base}/territories`} style={{ fontWeight: loc.pathname.includes('territories') ? 600 : 400 }}>Территории</Link>
        <Link to={`${base}/sources`} style={{ fontWeight: loc.pathname.includes('sources') ? 600 : 400 }}>Источники</Link>
        <Link to={`${base}/pipelines`} style={{ fontWeight: loc.pathname.includes('pipelines') ? 600 : 400 }}>Воронки</Link>
      </nav>
      <Routes>
        <Route index element={<SettingsHome />} />
        <Route path="territories" element={<div>Территории (справочник). API: GET/POST/PATCH /territories</div>} />
        <Route path="sources" element={<div>Источники. API: GET/POST /sources</div>} />
        <Route path="pipelines" element={<div>Воронки и стадии. API: GET /pipelines, GET/POST/PATCH /pipelines/:id/stages</div>} />
      </Routes>
    </div>
  );
}

function SettingsHome() {
  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: '1.5rem', maxWidth: 560 }}>
      <p style={{ color: '#64748b', margin: 0 }}>
        Настройте территории, источники лидов и воронки продаж. Эти данные используются при создании лидов и сделок.
      </p>
    </div>
  );
}
