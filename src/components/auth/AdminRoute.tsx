import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      {user?.role === "admin" ? children : <Navigate to="/forbidden" replace />}
    </ProtectedRoute>
  );
};

export default AdminRoute;
