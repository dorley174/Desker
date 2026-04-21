import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { describeBookingStatus, statusPill } from "@/lib/booking-helpers";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Shield, UserCircle2 } from "lucide-react";

const Profile = () => {
  const { user, loading, isAdmin } = useAuth();

  const bookingsQuery = useQuery({
    queryKey: ["profile-active-bookings"],
    queryFn: () => api.history({ page: 1, pageSize: 5, status: "active", sortBy: "booking_date", sortOrder: "ASC" }),
    enabled: Boolean(user),
  });

  const activeBookings = useMemo(() => bookingsQuery.data?.items ?? [], [bookingsQuery.data]);

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-8 text-muted-foreground">Загрузка профиля...</div>;
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Профиль</h1>
          <p className="mt-2 text-muted-foreground">Личная карточка сотрудника, активные бронирования и уровень доступа в системе.</p>
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Активные бронирования</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bookingsQuery.isLoading ? <div className="text-sm text-muted-foreground">Подгружаем бронирования...</div> : null}
          {bookingsQuery.error ? <div className="text-sm text-destructive">Не удалось загрузить активные бронирования.</div> : null}
          {!bookingsQuery.isLoading && activeBookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">Сейчас у вас нет активных бронирований. <Link to="/booking" className="text-primary hover:underline">Перейти к выбору места</Link>.</div>
          ) : activeBookings.map((booking) => (
            <div key={booking.id} className="rounded-2xl border p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-semibold">Этаж {booking.floor} · Место {booking.seatNumber} · Зона {booking.zone}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{booking.date} · {booking.startHour}:00–{booking.endHour}:00</div>
                </div>
                <span className={cn("rounded-full border px-3 py-1 text-xs", statusPill(booking.status))}>{describeBookingStatus(booking.status)}</span>
              </div>
            </div>
          ))}
          <div className="pt-2"><Button variant="outline" asChild><Link to="/history">Открыть полную историю</Link></Button></div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
