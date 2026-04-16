import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Shield, UserCircle2 } from "lucide-react";

const Profile = () => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-8 text-muted-foreground">Загрузка профиля...</div>;
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Профиль</h1>
          <p className="mt-2 text-muted-foreground">Личная карточка сотрудника и уровень доступа в системе.</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/settings">Редактировать</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <Avatar className="h-24 w-24"><AvatarFallback className="bg-primary text-2xl text-primary-foreground">{user.firstName[0]}{user.lastName[0]}</AvatarFallback></Avatar>
            <div><div className="text-2xl font-bold">{user.firstName} {user.lastName}</div><div className="mt-2 flex justify-center gap-2"><Badge variant={isAdmin ? "default" : "secondary"}>{isAdmin ? "Администратор" : "Сотрудник"}</Badge></div></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Данные аккаунта</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><UserCircle2 className="h-4 w-4" /> Имя</div><div className="mt-2 font-medium">{user.firstName}</div></div>
            <div className="rounded-xl border p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><UserCircle2 className="h-4 w-4" /> Фамилия</div><div className="mt-2 font-medium">{user.lastName}</div></div>
            <div className="rounded-xl border p-4 sm:col-span-2"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-4 w-4" /> Email</div><div className="mt-2 font-medium">{user.email}</div></div>
            <div className="rounded-xl border p-4 sm:col-span-2"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Shield className="h-4 w-4" /> Доступ</div><div className="mt-2 text-sm text-muted-foreground">{isAdmin ? "Есть доступ к бронированию и админской аналитике." : "Есть доступ к сценарию бронирования, истории и личным настройкам."}</div></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
