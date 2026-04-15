import { useAuth } from "@/context/AuthContext";
import Landing from "./Landing";
import Booking from "./Booking";

const Index = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 text-muted-foreground">
        Загрузка...
      </div>
    );
  }
  return user ? <Booking /> : <Landing />;
};

export default Index;
