import { useAuth } from '@/features/auth/AuthProvider';
import { BookingPage } from '@/features/booking/BookingPage';
import styles from './HomePage.module.css';

export function HomePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="card" style={{ padding: 16 }}>Загрузка…</div>;
  }

  if (!user) {
    return (
      <div className={styles.landing}>
        <div className="card" style={{ padding: 18 }}>
          <h1 className={styles.h1}>Добро пожаловать в Desker</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Здесь можно забронировать рабочее место в офисе на нужное время.
            Эта секция — заглушка для новых пользователей.
          </p>

          <div className={styles.grid}>
            <div className="card" style={{ padding: 14 }}>
              <div className="badge">Быстро</div>
              <h3 style={{ margin: '10px 0 6px' }}>Почасовая бронь</h3>
              <p className="muted" style={{ margin: 0 }}>
                Выбирайте удобные слоты по часу, как в календаре.
              </p>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <div className="badge">Удобно</div>
              <h3 style={{ margin: '10px 0 6px' }}>Ручной выбор и автоподбор</h3>
              <p className="muted" style={{ margin: 0 }}>
                Можно выбрать место на карте или довериться рекомендации.
              </p>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <div className="badge">Прозрачно</div>
              <h3 style={{ margin: '10px 0 6px' }}>История бронирований</h3>
              <p className="muted" style={{ margin: 0 }}>
                Весь ваш «след» бронирований хранится в личной истории.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <BookingPage />;
}
