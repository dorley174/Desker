import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };

  const [email, setEmail] = useState('demo@desker.local');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      navigate(location.state?.from ?? '/', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: '0 auto', padding: 18 }}>
      <h1 style={{ margin: 0 }}>Вход</h1>
      <p className="muted" style={{ marginTop: 6 }}>
        Демо-аккаунт: <b>demo@desker.local</b> / <b>demo1234</b>
      </p>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span className="muted">Email</span>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span className="muted">Пароль</span>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        {error && (
          <div className="card" style={{ padding: 12, borderColor: 'var(--danger)' }}>
            <span style={{ color: 'var(--danger)' }}>{error}</span>
          </div>
        )}

        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? 'Входим…' : 'Войти'}
        </button>
      </form>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
        <Link className="btn link" to="/register">Зарегистрироваться</Link>
        <Link className="btn link" to="/forgot">Забыли пароль?</Link>
      </div>
    </div>
  );
}
