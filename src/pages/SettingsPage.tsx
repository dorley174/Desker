import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, updateProfile, changePassword, logout } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');

  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user?.avatarUrl);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setAvatarUrl(user?.avatarUrl);
  }, [user?.firstName, user?.lastName, user?.avatarUrl]);

  const isDirtyProfile = useMemo(() => {
    return (firstName.trim() !== (user?.firstName ?? '').trim()) ||
      (lastName.trim() !== (user?.lastName ?? '').trim()) ||
      (avatarUrl !== user?.avatarUrl);
  }, [firstName, lastName, avatarUrl, user?.firstName, user?.lastName, user?.avatarUrl]);

  const isDirtyPassword = useMemo(() => {
    return currentPassword.length > 0 || newPassword.length > 0 || newPassword2.length > 0;
  }, [currentPassword, newPassword, newPassword2]);

  const showSave = isDirtyProfile || isDirtyPassword;

  async function onSave() {
    setError(null);
    setSaving(true);
    try {
      if (isDirtyProfile) {
        await updateProfile({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          avatarUrl,
        });
      }

      if (isDirtyPassword) {
        if (!currentPassword || !newPassword || !newPassword2) {
          throw new Error('Заполните поля смены пароля полностью');
        }
        if (newPassword !== newPassword2) {
          throw new Error('Новый пароль и подтверждение не совпадают');
        }
        await changePassword({ currentPassword, newPassword });
        setCurrentPassword('');
        setNewPassword('');
        setNewPassword2('');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(typeof reader.result === 'string' ? reader.result : undefined);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="card" style={{ padding: 18, maxWidth: 760, margin: '0 auto' }}>
      <button className="btn" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
        ← Назад
      </button>

      <h1 style={{ margin: 0 }}>Настройки</h1>
      <p className="muted" style={{ marginTop: 6 }}>
        Изменение профиля и безопасности аккаунта.
      </p>

      <hr />

      <section style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Профиль</h2>

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

        <div style={{ display: 'grid', gap: 8 }}>
          <span className="muted">Аватар</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              aria-label="avatar preview"
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                border: '1px solid var(--border)',
                background: '#e5e7eb',
                backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onAvatarFile(e.target.files?.[0] ?? null)}
            />
            {avatarUrl && (
              <button className="btn" onClick={() => setAvatarUrl(undefined)}>
                Удалить
              </button>
            )}
          </div>
        </div>
      </section>

      <hr />

      <section style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Безопасность</h2>

        <label style={{ display: 'grid', gap: 6 }}>
          <span className="muted">Текущий пароль</span>
          <input className="input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="muted">Новый пароль</span>
            <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="muted">Повторите пароль</span>
            <input className="input" type="password" value={newPassword2} onChange={(e) => setNewPassword2(e.target.value)} />
          </label>
        </div>
      </section>

      <hr />

      <section style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Аккаунт</h2>
        <button
          className="btn danger"
          onClick={() => {
            logout();
            navigate('/');
          }}
        >
          Выйти из аккаунта
        </button>
      </section>

      {error && (
        <div className="card" style={{ padding: 12, borderColor: 'var(--danger)', marginTop: 14 }}>
          <span style={{ color: 'var(--danger)' }}>{error}</span>
        </div>
      )}

      {showSave && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn primary" onClick={onSave} disabled={saving}>
            {saving ? 'Сохраняем…' : 'Сохранить изменения'}
          </button>
        </div>
      )}
    </div>
  );
}
