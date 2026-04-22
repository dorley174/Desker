import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDateKey } from "@/lib/booking-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, LayoutDashboard } from "lucide-react";

const AdminDashboard = () => {
  const [date, setDate] = useState(new Date());
  const dateString = formatDateKey(date);

  const floorMetricsQuery = useQuery({
    queryKey: ["admin-floor-metrics", dateString],
    queryFn: async () => {
      const floors = await api.floors();
      const normalizedFloors = Array.isArray(floors) ? floors : [];
      return Promise.all(
        normalizedFloors.map(async (floor) => ({
          floor,
          seats: await api.seats({ floor, date: dateString, status: "all" }),
        })),
      );
    },
  });

  const metrics = useMemo(() => {
    const floors = floorMetricsQuery.data ?? [];
    const allSeats = floors.flatMap((entry) => entry.seats);
    const total = allSeats.length;
    const free = allSeats.filter((seat) => seat.status === "free").length;
    const occupied = allSeats.filter((seat) => seat.status === "occupied").length;
    const mine = allSeats.filter((seat) => seat.status === "mine").length;
    const unavailable = allSeats.filter((seat) => seat.status === "unavailable").length;
    const tagCoverage = new Map<string, number>();

    allSeats.forEach((seat) => {
      seat.tags.forEach((tag) => {
        tagCoverage.set(tag, (tagCoverage.get(tag) ?? 0) + 1);
      });
    });

    return {
      total,
      free,
      occupied,
      mine,
      unavailable,
      floorRows: floors.map((entry) => {
        const floorTotal = entry.seats.length;
        const floorOccupied = entry.seats.filter((seat) => seat.status === "occupied" || seat.status === "mine").length;
        const occupancyPercent = floorTotal > 0 ? Math.round((floorOccupied / floorTotal) * 100) : 0;
        return {
          floor: entry.floor,
          total: floorTotal,
          free: entry.seats.filter((seat) => seat.status === "free").length,
          occupied: floorOccupied,
          unavailable: entry.seats.filter((seat) => seat.status === "unavailable").length,
          occupancyPercent,
        };
      }),
      topTags: [...tagCoverage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
    };
  }, [floorMetricsQuery.data]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-primary"><LayoutDashboard className="h-4 w-4" /> Operational dashboard</div>
          <h1 className="text-3xl font-bold tracking-tight">Админ-панель</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">Панель показывает загрузку этажей и покрытие сценариев по реальным данным backend API. Все показатели считаются по текущему состоянию мест и бронирований на выбранную дату.</p>
        </div>
        <Popover>
          <PopoverTrigger asChild><Button variant="outline" className="justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{format(date, "PPP", { locale: ru })}</Button></PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end"><Calendar mode="single" selected={date} onSelect={(value) => value && setDate(value)} className="p-3" /></PopoverContent>
        </Popover>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Всего мест</div><div className="mt-2 text-3xl font-bold">{metrics.total}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Свободно</div><div className="mt-2 text-3xl font-bold text-emerald-600">{metrics.free}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Занято</div><div className="mt-2 text-3xl font-bold text-amber-600">{metrics.occupied + metrics.mine}</div></CardContent></Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">Недоступно</div>
            <div className="mt-2 text-3xl font-bold text-slate-500">{metrics.unavailable}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader><CardTitle>Загрузка по этажам</CardTitle><CardDescription>{floorMetricsQuery.isLoading ? "Собираем аналитику..." : "Сводка по текущей доступности мест на выбранную дату"}</CardDescription></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Этаж</TableHead><TableHead>Всего</TableHead><TableHead>Свободно</TableHead><TableHead>Занято</TableHead><TableHead>Недоступно</TableHead><TableHead>Загрузка</TableHead></TableRow></TableHeader>
              <TableBody>
                {metrics.floorRows.map((row) => (
                  <TableRow key={row.floor}><TableCell className="font-medium">{row.floor}</TableCell><TableCell>{row.total}</TableCell><TableCell>{row.free}</TableCell><TableCell>{row.occupied}</TableCell><TableCell>{row.unavailable}</TableCell><TableCell className="w-[220px]"><div className="flex items-center gap-3"><Progress value={row.occupancyPercent} className="h-2" /><span className="text-xs text-muted-foreground">{row.occupancyPercent}%</span></div></TableCell></TableRow>
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
    </div>
  );
};

export default AdminDashboard;
