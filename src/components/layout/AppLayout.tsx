import { Outlet } from 'react-router-dom';
import { Header } from '@/components/header/Header';
import { Footer } from '@/components/footer/Footer';
import styles from './AppLayout.module.css';

export function AppLayout() {
  return (
    <div className={styles.shell}>
      <Header />
      <main className={styles.main}>
        <div className="container">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}
