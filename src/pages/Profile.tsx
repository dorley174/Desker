import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield } from "lucide-react";

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Назад
      </Button>
      <h1 className="mb-6 text-2xl font-bold">Профиль</h1>

      <div className="flex items-center gap-4 rounded-lg border bg-card p-6 shadow-sm">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary text-primary-foreground text-xl">
            {user.firstName[0]}{user.lastName[0]}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-lg font-semibold">{user.firstName} {user.lastName}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            Роль: {user.role === "admin" ? (
              <Badge className="bg-primary"><Shield className="h-3 w-3 mr-1" />Администратор</Badge>
            ) : "Сотрудник"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
