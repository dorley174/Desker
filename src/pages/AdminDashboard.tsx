import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarIcon, LayoutDashboard, Lock, LockOpen } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatDateKey } from "@/lib/booking-helpers";
import { seatStatusTone, STATUS_LABELS } from "@/lib/seat-meta";
import { cn } from "@/lib/utils";

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date());
  const [selectedFloor, setSelectedFloor] = useState(1);
  const dateString = formatDateKey(date);

  const floorsQuery = useQuery({
    queryKey: ["floors"],
    queryFn: () => api.floors(),
  });

  const floors = useMemo(() => (Array.isArray(floorsQuery.data) && floorsQuery.data.length > 0 ? floorsQuery.data : [1, 2, 3, 4, 5, 6]), [floorsQuery.data]);

  useEffect(() => {
    if (!floors.includes(selectedFloor)) {
      setSelectedFloor(floors[0] ?? 1);
    }
  }, [floors, selectedFloor]);

  const floorMetricsQuery = useQuery({
    queryKey: ["admin-floor-metrics", dateString, floors.join("|")],
    queryFn: async () => Promise.all(
      floors.map(async (floor) => ({
        floor,
        seats: await api.seats({ floor, date: dateString, status: "all" }),
      })),
    ),
  });

  const selectedFloorSeatsQuery = useQuery({
    queryKey: ["admin-floor-seats", selectedFloor, dateString],
    queryFn: () => api.seats({ floor: selectedFloor, date: dateString, status: "all" }),
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: ({ seatId, available }: { seatId: string; available: boolean }) => api.setSeatAvailability(seatId, available),
    onSuccess: (_, variables) => {
      toast.success(variables.available ? "Место снова доступно для бронирования" : "Место заблокировано");
      void queryClient.invalidateQueries({ queryKey: ["admin-floor-metrics"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-floor-seats"] });
      void queryClient.invalidateQueries({ queryKey: ["seats"] });
      void queryClient.invalidateQueries({ queryKey: ["seat-slots"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Не удалось изменить доступность места");
    },
  });

  const metrics = useMemo(() => {
    const floorEntries = floorMetricsQuery.data ?? [];
    const allSeats = floorEntries.flatMap((entry) => entry.seats ?? []);
    const total = allSeats.length;
    const free = allSeats.filter((seat) => seat.status === "free").length;
    const occupied = allSeats.filter((seat) => seat.status === "occupied").length;
    const mine = allSeats.filter((seat) => seat.status === "mine").length;
    const unavailable = allSeats.filter((seat) => seat.status === "unavailable").length;
    const tagCoverage = new Map<string, number>();

    allSeats.forEach((seat) => {
      seat.tags.forEach((tag) => tagCoverage.set(tag, (tagCoverage.get(tag) ?? 0) + 1));
    });

    return {
      total,
      free,
      occupied,
      mine,
      unavailable,
      floorRows: floorEntries.map((entry) => {
        const floorSeats = entry.seats ?? [];
        const floorTotal = floorSeats.length;
        const floorOccupied = floorSeats.filter((seat) => seat.status === "occupied" || seat.status === "mine").length;
        return {
          floor: entry.floor,
          total: floorTotal,
          free: floorSeats.filter((seat) => seat.status === "free").length,
          occupied: floorOccupied,
          unavailable: floorSeats.filter((seat) => seat.status === "unavailable").length,
          occupancyPercent: floorTotal > 0 ? Math.round((floorOccupied / floorTotal) * 100) : 0,
        };
      }),
      topTags: [...tagCoverage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
    };
  }, [floorMetricsQuery.data]);

  const selectedFloorSeats = useMemo(
    () => (Array.isArray(selectedFloorSeatsQuery.data) ? selectedFloorSeatsQuery.data : []),
    [selectedFloorSeatsQuery.data],
  );

  const blockedSeats = useMemo(
    () => selectedFloorSeats.filter((seat) => seat.status === "unavailable"),
    [selectedFloorSeats],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-primary"><LayoutDashboard className="h-4 w-4" /> Operational dashboard</div>
          <h1 className="text-3xl font-bold tracking-tight">Админ-панель</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Панель показывает загрузку этажей, покрытие оснащения и позволяет управлять недоступными местами для выбранного этажа.
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{format(date, "PPP", { locale: ru })}</Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end"><Calendar mode="single" selected={date} onSelect={(value) => value && setDate(value)} className="p-3" /></PopoverContent>
        </Popover>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Всего мест</div><div className="mt-2 text-3xl font-bold">{metrics.total}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Свободно</div><div className="mt-2 text-3xl font-bold text-emerald-600">{metrics.free}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Занято</div><div className="mt-2 text-3xl font-bold text-amber-600">{metrics.occupied + metrics.mine}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Заблокировано</div><div className="mt-2 text-3xl font-bold text-slate-500">{metrics.unavailable}</div></CardContent></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>Загрузка по этажам</CardTitle>
            <CardDescription>{floorMetricsQuery.isLoading ? "Собираем аналитику..." : "Сводка по текущей доступности мест на выбранную дату"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Этаж</TableHead><TableHead>Всего</TableHead><TableHead>Свободно</TableHead><TableHead>Занято</TableHead><TableHead>Заблокировано</TableHead><TableHead>Загрузка</TableHead></TableRow></TableHeader>
              <TableBody>
                {metrics.floorRows.map((row) => (
                  <TableRow key={row.floor}>
                    <TableCell className="font-medium">{row.floor}</TableCell>
                    <TableCell>{row.total}</TableCell>
                    <TableCell>{row.free}</TableCell>
                    <TableCell>{row.occupied}</TableCell>
                    <TableCell>{row.unavailable}</TableCell>
                    <TableCell className="w-[220px]"><div className="flex items-center gap-3"><Progress value={row.occupancyPercent} className="h-2" /><span className="text-xs text-muted-foreground">{row.occupancyPercent}%</span></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Популярное оснащение</CardTitle><CardDescription>Наиболее часто встречающиеся теги среди мест</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {metrics.topTags.map(([tag, count]) => (<div key={tag} className="flex items-center justify-between rounded-xl border p-3"><span className="text-sm font-medium">{tag}</span><Badge variant="secondary">{count}</Badge></div>))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Заблокированные</CardTitle>
            <CardDescription>Серые места, полностью недоступные для бронирования на выбранном этаже</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {floors.map((floor) => (
                <Button key={floor} variant={selectedFloor === floor ? "default" : "outline"} size="sm" onClick={() => setSelectedFloor(floor)}>
                  Этаж {floor}
                </Button>
              ))}
            </div>

            {selectedFloorSeatsQuery.error ? (
              <Alert variant="destructive"><AlertDescription>{selectedFloorSeatsQuery.error instanceof Error ? selectedFloorSeatsQuery.error.message : "Не удалось загрузить места этажа"}</AlertDescription></Alert>
            ) : selectedFloorSeatsQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Загрузка мест...</div>
            ) : blockedSeats.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">На выбранном этаже нет заблокированных мест.</div>
            ) : (
              <div className="space-y-3">
                {blockedSeats.map((seat) => (
                  <div key={seat.id} className={cn("flex items-center justify-between rounded-2xl border px-4 py-3", seatStatusTone("unavailable"))}>
                    <div>
                      <div className="font-semibold">Место {seat.number}</div>
                      <div className="text-xs opacity-80">Этаж {seat.floor} · Зона {seat.zone} · {STATUS_LABELS.unavailable}</div>
                    </div>
                    <Button size="sm" variant="secondary" disabled={toggleAvailabilityMutation.isPending} onClick={() => toggleAvailabilityMutation.mutate({ seatId: seat.id, available: true })}>
                      <LockOpen className="mr-2 h-4 w-4" /> Разблокировать
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Управление доступностью мест</CardTitle>
            <CardDescription>Администратор может вручную снимать и возвращать доступ к рабочим местам.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedFloorSeatsQuery.error ? (
              <Alert variant="destructive"><AlertDescription>{selectedFloorSeatsQuery.error instanceof Error ? selectedFloorSeatsQuery.error.message : "Не удалось загрузить места этажа"}</AlertDescription></Alert>
            ) : selectedFloorSeatsQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Загрузка мест...</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {selectedFloorSeats.map((seat) => {
                  const blocked = seat.status === "unavailable";
                  return (
                    <div key={seat.id} className={cn("rounded-2xl border p-4 shadow-sm", seatStatusTone(seat.status))}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold">Место {seat.number}</div>
                          <div className="text-xs opacity-80">Этаж {seat.floor} · Зона {seat.zone}</div>
                        </div>
                        <Badge variant="outline">{STATUS_LABELS[seat.status]}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {seat.tags.length > 0 ? seat.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>) : <Badge variant="outline">Без тегов</Badge>}
                      </div>
                      <Button className="mt-4 w-full" variant={blocked ? "secondary" : "destructive"} disabled={toggleAvailabilityMutation.isPending} onClick={() => toggleAvailabilityMutation.mutate({ seatId: seat.id, available: blocked })}>
                        {blocked ? <><LockOpen className="mr-2 h-4 w-4" /> Вернуть в доступ</> : <><Lock className="mr-2 h-4 w-4" /> Заблокировать</>}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
