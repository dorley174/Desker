import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ToastProvider } from '@/components/ui/toast/ToastProvider';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/booking" element={<Navigate to="/" replace />} />

            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot" element={<ForgotPasswordPage />} />

            <Route
              path="/settings"
              element={
                <RequireAuth>
                  <SettingsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/history"
              element={
                <RequireAuth>
                  <HistoryPage />
                </RequireAuth>
              }
            />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <ProfilePage />
                </RequireAuth>
              }
            />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
