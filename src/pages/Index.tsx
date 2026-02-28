import { useAuth } from "@/context/AuthContext";
import Landing from "./Landing";
import Booking from "./Booking";

const Index = () => {
  const { user } = useAuth();
  return user ? <Booking /> : <Landing />;
};

export default Index;
