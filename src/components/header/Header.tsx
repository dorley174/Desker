import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import styles from './Header.module.css';

export function Header() {
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const displayName = useMemo(() => {
    if (!user) return '';
    const full = `${user.firstName} ${user.lastName}`.trim();
    return full || user.email;
  }, [user]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link className={styles.logo} to="/" aria-label="Desker — на главную">
          Desker
        </Link>

        <div className={styles.right}>
          {isLoading ? (
            <span className="muted">…</span>
          ) : !user ? (
            <div className={styles.actions}>
              <button className="btn" onClick={() => navigate('/login')}>Войти</button>
              <button className="btn primary" onClick={() => navigate('/register')}>Зарегистрироваться</button>
            </div>
          ) : (
            <div className={styles.profileWrap} ref={menuRef}>
              <button
                className={styles.profileButton}
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
              >
                <span className={styles.avatar} aria-hidden />
                <span className={styles.name}>{displayName}</span>
                <span className={styles.chevron} aria-hidden>▾</span>
              </button>

              {open && (
                <div className={styles.menu} role="menu">
                  <button className={styles.menuItem} role="menuitem" onClick={() => { setOpen(false); navigate('/profile'); }}>
                    Профиль
                  </button>
                  <button className={styles.menuItem} role="menuitem" onClick={() => { setOpen(false); navigate('/settings'); }}>
                    Настройки
                  </button>
                  <button className={styles.menuItem} role="menuitem" onClick={() => { setOpen(false); navigate('/history'); }}>
                    История
                  </button>
                  <div className={styles.sep} />
                  <button
                    className={`${styles.menuItem} ${styles.danger}`}
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      logout();
                      navigate('/');
                    }}
                  >
                    Выйти
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
