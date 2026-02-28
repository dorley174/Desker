import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import styles from './Footer.module.css';

export function Footer() {
  const today = format(new Date(), 'd MMMM yyyy', { locale: ru });

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.left}>
          <span className="muted">{today}</span>
          <span className={styles.dot} aria-hidden>•</span>
          <a className={styles.link} href="#" onClick={(e) => { e.preventDefault(); window.open('https://example.com', '_blank'); }}>
            desker.example
          </a>
        </div>

        <div className={styles.right}>
          <button
            className="btn"
            onClick={() => {
              // BACKEND/CONTENT INTEGRATION: заменить на страницу "О компании" или модал с контентом.
              alert('Desker — сервис бронирования рабочих мест. (Заглушка: контент добавим позже)');
            }}
          >
            О компании
          </button>
          <span className="muted">© {new Date().getFullYear()} Desker</span>
        </div>
      </div>
    </footer>
  );
}
