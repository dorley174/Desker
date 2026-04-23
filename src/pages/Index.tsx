import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Landing from "@/pages/Landing";

const Index = () => {
  const { user, loading, preferredHomeRoute } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 text-muted-foreground">
        Загружаем рабочее пространство...
      </div>
    );
  }

  if (!user) return <Landing />;

  return <Navigate to={preferredHomeRoute} replace />;
};

export default Index;
