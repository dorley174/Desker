import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="card" style={{ padding: 18 }}>
      <h1 style={{ margin: 0 }}>404</h1>
      <p className="muted" style={{ marginTop: 6 }}>Страница не найдена.</p>
      <Link className="btn" to="/">На главную</Link>
    </div>
  );
}
