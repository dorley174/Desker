import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { describeBookingStatus, statusPill } from "@/lib/booking-helpers";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const HistoryPage = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed" | "cancelled" | "no-show">("all");

  const historyQuery = useQuery({
    queryKey: ["bookings-history", statusFilter],
    queryFn: () => api.history({ page: 1, pageSize: 100, status: statusFilter === "all" ? undefined : statusFilter, sortBy: "booking_date", sortOrder: "DESC" }),
  });

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => api.cancelBooking(bookingId),
    onSuccess: () => {
      toast.success("Бронирование отменено");
      void queryClient.invalidateQueries({ queryKey: ["bookings-history"] });
      void queryClient.invalidateQueries({ queryKey: ["seats"] });
      void queryClient.invalidateQueries({ queryKey: ["seat-slots"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Не удалось отменить бронирование");
    },
  });

  const bookings = useMemo(() => historyQuery.data?.items ?? [], [historyQuery.data]);

  const summary = useMemo(() => bookings.reduce((acc, booking) => { acc.total += 1; acc[booking.status] += 1; return acc; }, { total: 0, active: 0, completed: 0, cancelled: 0, "no-show": 0 }), [bookings]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6"><h1 className="text-3xl font-bold tracking-tight">Мои бронирования</h1><p className="mt-2 text-muted-foreground">Список активных и завершённых броней. Отсюда можно быстро отменить будущий резерв и проверить историю посещений.</p></div>
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5"><Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Всего</div><div className="mt-2 text-2xl font-bold">{summary.total}</div></CardContent></Card><Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Активные</div><div className="mt-2 text-2xl font-bold text-sky-600">{summary.active}</div></CardContent></Card><Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Завершённые</div><div className="mt-2 text-2xl font-bold text-emerald-600">{summary.completed}</div></CardContent></Card><Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Отменённые</div><div className="mt-2 text-2xl font-bold text-rose-600">{summary.cancelled}</div></CardContent></Card><Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">No-show</div><div className="mt-2 text-2xl font-bold text-amber-600">{summary["no-show"]}</div></CardContent></Card></div>
      <Card><CardHeader><CardTitle>Лента бронирований</CardTitle><CardDescription>Фильтрация по статусу и быстрые действия по активным бронированиям</CardDescription></CardHeader><CardContent className="space-y-4"><Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}><TabsList className="grid w-full grid-cols-5"><TabsTrigger value="all">Все</TabsTrigger><TabsTrigger value="active">Активные</TabsTrigger><TabsTrigger value="completed">Завершённые</TabsTrigger><TabsTrigger value="cancelled">Отменённые</TabsTrigger><TabsTrigger value="no-show">No-show</TabsTrigger></TabsList></Tabs>{historyQuery.error ? <Alert variant="destructive"><AlertDescription>{historyQuery.error instanceof Error ? historyQuery.error.message : "Не удалось загрузить историю"}</AlertDescription></Alert> : null}{historyQuery.isLoading ? <div className="text-sm text-muted-foreground">Загрузка истории...</div> : bookings.length === 0 ? <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Для выбранного статуса бронирований пока нет.</div> : <div className="space-y-3">{bookings.map((booking) => (<div key={booking.id} className="rounded-2xl border p-4 shadow-sm"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="font-semibold">Этаж {booking.floor} · Место {booking.seatNumber} · Зона {booking.zone}</div><div className="mt-1 text-sm text-muted-foreground">{booking.date} · {booking.startHour}:00–{booking.endHour}:00</div></div><div className="flex flex-wrap items-center gap-2"><span className={cn("rounded-full border px-3 py-1 text-xs", statusPill(booking.status))}>{describeBookingStatus(booking.status)}</span>{booking.status === "active" ? <Button variant="outline" size="sm" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate(booking.id)}>Отменить</Button> : null}</div></div></div>))}</div>}</CardContent></Card>
    </div>
  );
};

export default HistoryPage;
