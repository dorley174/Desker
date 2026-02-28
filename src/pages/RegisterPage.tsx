import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('EMPLOYEE-2026');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim() || !inviteCode.trim() || !firstName.trim() || !lastName.trim()) {
      setError('Заполните все поля');
      return;
    }

    setLoading(true);
    try {
      await register({ email, password, inviteCode, firstName, lastName });
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 560, margin: '0 auto', padding: 18 }}>
      <h1 style={{ margin: 0 }}>Регистрация</h1>
      <p className="muted" style={{ marginTop: 6 }}>
        Регистрация в Desker происходит по инвайт-коду (роль берётся из кода).
        Для демо используйте: <b>EMPLOYEE-2026</b>
      </p>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="muted">Имя</span>
            <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="muted">Фамилия</span>
            <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </label>
        </div>

        <label style={{ display: 'grid', gap: 6 }}>
          <span className="muted">Email</span>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span className="muted">Пароль</span>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span className="muted">Инвайт-код</span>
          <input className="input" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
        </label>

        {error && (
          <div className="card" style={{ padding: 12, borderColor: 'var(--danger)' }}>
            <span style={{ color: 'var(--danger)' }}>{error}</span>
          </div>
        )}

        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? 'Создаём…' : 'Зарегистрироваться'}
        </button>
      </form>

      <div style={{ marginTop: 12 }}>
        <Link className="btn link" to="/login">Уже есть аккаунт? Войти</Link>
      </div>
    </div>
  );
}
