import { useState } from 'react';
import { Link } from 'react-router-dom';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // BACKEND INTEGRATION: trigger password reset flow.
    setSent(true);
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: '0 auto', padding: 18 }}>
      <h1 style={{ margin: 0 }}>Восстановление пароля</h1>
      <p className="muted" style={{ marginTop: 6 }}>
        Заглушка для фронтенда. В бэкенде будет отправка ссылки/кода на почту.
      </p>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span className="muted">Email</span>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
        </label>

        <button className="btn primary" type="submit" disabled={!email.trim()}>
          Восстановить
        </button>

        {sent && (
          <div className="card" style={{ padding: 12, borderColor: 'var(--ok)' }}>
            <span style={{ color: 'var(--ok)' }}>Если такой email существует, мы отправили инструкции.</span>
          </div>
        )}
      </form>

      <div style={{ marginTop: 12 }}>
        <Link className="btn link" to="/login">Назад ко входу</Link>
      </div>
    </div>
  );
}
