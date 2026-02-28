import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="card" style={{ padding: 16 }}>Загрузка…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
