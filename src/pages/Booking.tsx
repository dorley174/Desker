import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, Clock3, MapPin, Sparkles, Wand2 } from "lucide-react";
import { api } from "@/lib/api";
import type { HourSlot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { buildHourSegments, buildRecurringDates, buildWalkInHours, describeBookingStatus, formatDateKey, isToday, normalizeSelectedHours, selectionSummary, statusPill } from "@/lib/booking-helpers";
import { groupSeatsByZone, recommendationScore, seatStatusTone, seatSummary, seatTypeLabel, STATUS_LABELS } from "@/lib/seat-meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const slotTone: Record<HourSlot["status"], string> = {
  free: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  occupied: "border-amber-200 bg-amber-50 text-amber-700 opacity-70 cursor-not-allowed",
  mine: "border-sky-200 bg-sky-50 text-sky-700 opacity-90 cursor-not-allowed",
};

const Booking = () => {
  const queryClient = useQueryClient();
  const [floor, setFloor] = useState(1);
  const [date, setDate] = useState<Date>(new Date());
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "free" | "occupied">("all");
  const [query, setQuery] = useState("");
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [bookingInProgress, setBookingInProgress] = useState(false);

  const dateString = useMemo(() => formatDateKey(date), [date]);

  const floorsQuery = useQuery({
    queryKey: ["floors"],
    queryFn: () => api.floors(),
  });

  const tagsQuery = useQuery({
    queryKey: ["equipment-tags"],
    queryFn: () => api.equipmentTags(),
  });

  const seatsQuery = useQuery({
    queryKey: ["seats", floor, dateString, selectedTags, statusFilter],
    queryFn: () =>
      api.seats({
        floor,
        date: dateString,
        tags: selectedTags,
        status: statusFilter,
      }),
  });

  const historyQuery = useQuery({
    queryKey: ["bookings-history", "active-summary"],
    queryFn: () =>
      api.history({
        page: 1,
        pageSize: 50,
        sortBy: "booking_date",
        sortOrder: "ASC",
      }),
  });

  const seats = useMemo(() => seatsQuery.data ?? [], [seatsQuery.data]);
  const tags = useMemo(() => tagsQuery.data ?? [], [tagsQuery.data]);
  const floors = useMemo(() => floorsQuery.data ?? [1, 2, 3, 4, 5, 6], [floorsQuery.data]);
  const selectedTagsKey = selectedTags.join("|");

  const selectedSeat = useMemo(
    () => seats.find((seat) => seat.id === selectedSeatId) ?? null,
    [seats, selectedSeatId],
  );

  const slotsQuery = useQuery({
    queryKey: ["seat-slots", selectedSeat?.id, dateString],
    queryFn: () => api.seatSlots(selectedSeat!.id, dateString),
    enabled: Boolean(selectedSeat),
  });

  useEffect(() => {
    setSelectedSeatId(null);
    setSelectedHours([]);
  }, [floor, dateString, statusFilter, selectedTagsKey, query]);

  useEffect(() => {
    setSelectedHours([]);
  }, [selectedSeatId, dateString]);

  const filteredSeats = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return seats;
    return seats.filter((seat) => {
      const haystack = `${seat.number} ${seat.zone} ${seat.tags.join(" ")} ${seatTypeLabel(seat)}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [seats, query]);

  const groupedSeats = useMemo(() => groupSeatsByZone(filteredSeats), [filteredSeats]);

  const seatStats = useMemo(() => {
    return seats.reduce(
      (stats, seat) => {
        stats.total += 1;
        stats[seat.status] += 1;
        return stats;
      },
      { total: 0, free: 0, occupied: 0, mine: 0, unavailable: 0 },
    );
  }, [seats]);

  const recommendedSeat = useMemo(() => {
    const candidates = filteredSeats.filter((seat) => seat.status === "free");
    if (candidates.length === 0) return null;
    return [...candidates].sort((a, b) => recommendationScore(a, selectedTags) - recommendationScore(b, selectedTags))[0];
  }, [filteredSeats, selectedTags]);

  const activeBookings = useMemo(() => {
    const items = historyQuery.data?.items ?? [];
    return items.filter((booking) => booking.status === "active").slice(0, 4);
  }, [historyQuery.data]);

  const selectedSegments = useMemo(() => buildHourSegments(selectedHours), [selectedHours]);

  const invalidateBookingData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["seats"] }),
      queryClient.invalidateQueries({ queryKey: ["seat-slots"] }),
      queryClient.invalidateQueries({ queryKey: ["bookings-history"] }),
    ]);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  };

  const toggleSlot = (slot: HourSlot) => {
    if (slot.status !== "free") return;
    setSelectedHours((current) => {
      if (current.includes(slot.hour)) {
        return current.filter((hour) => hour !== slot.hour);
      }
      return normalizeSelectedHours([...current, slot.hour]);
    });
  };

  const handleCreateBooking = async () => {
    if (!selectedSeat || selectedHours.length === 0) return;

    const dates = buildRecurringDates(date, repeatWeeks);
    setBookingInProgress(true);
    const succeeded: string[] = [];
    const conflicted: string[] = [];

    try {
      for (const bookingDate of dates) {
        try {
          await api.createBooking({
            seatId: selectedSeat.id,
            date: bookingDate,
            hours: selectedHours,
          });
          succeeded.push(bookingDate);
        } catch {
          conflicted.push(bookingDate);
        }
      }

      await invalidateBookingData();
      setSelectedHours([]);

      if (succeeded.length > 0) {
        toast.success(
          conflicted.length > 0
            ? `Создано бронирований: ${succeeded.length}. Конфликты на датах: ${conflicted.join(", ")}`
            : `Бронирование создано: ${succeeded.join(", ")}`,
        );
      } else {
        toast.error("Ни одно бронирование не удалось создать: все даты заняты.");
      }
    } finally {
      setBookingInProgress(false);
    }
  };

  const handleWalkIn = async () => {
    if (!selectedSeat || !slotsQuery.data) return;

    const hours = buildWalkInHours(slotsQuery.data, date);
    if (hours.length === 0) {
      toast.error("Для walk-in нужен сегодняшний день и свободный текущий слот.");
      return;
    }

    setBookingInProgress(true);
    try {
      await api.createBooking({ seatId: selectedSeat.id, date: dateString, hours });
      await invalidateBookingData();
      setSelectedHours([]);
      toast.success(`Walk-in оформлен: ${selectionSummary(hours)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось занять место сейчас");
    } finally {
      setBookingInProgress(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Бронирование рабочих мест</h1>
          <p className="mt-2 text-muted-foreground">
            Выберите дату, найдите подходящее место и создайте одиночную или еженедельную серию бронирований.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Этаж {floor}</Badge>
          <Badge variant="secondary">{format(date, "PPP", { locale: ru })}</Badge>
          <Badge variant="outline">Свободно {seatStats.free}</Badge>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Всего мест на этаже</div><div className="mt-2 text-3xl font-bold">{seatStats.total}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Свободно</div><div className="mt-2 text-3xl font-bold text-emerald-600">{seatStats.free}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Уже занято</div><div className="mt-2 text-3xl font-bold text-amber-600">{seatStats.occupied}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Мои активные брони</div><div className="mt-2 text-3xl font-bold text-sky-600">{activeBookings.length}</div></CardContent></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Фильтры</CardTitle>
            <CardDescription>Фильтруйте рабочие места по этажу, статусу и оснащению.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Этаж</div>
              <div className="grid grid-cols-3 gap-2">
                {floors.map((item) => (<Button key={item} variant={item === floor ? "default" : "outline"} size="sm" onClick={() => setFloor(item)}>{item}</Button>))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Дата</div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{format(date, "PPP", { locale: ru })}</Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={date} onSelect={(value) => value && setDate(value)} className="p-3" /></PopoverContent>
              </Popover>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Статус</div>
              <div className="grid gap-2">
                {([
                  ["all", "Все"],
                  ["free", "Только свободные"],
                  ["occupied", "Занятые и мои"],
                ] as const).map(([value, label]) => (<Button key={value} variant={statusFilter === value ? "default" : "outline"} className="justify-start" onClick={() => setStatusFilter(value)}>{label}</Button>))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Оснащение</div>
              <div className="space-y-2">
                {tags.map((tag) => (
                  <label key={tag} className="flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm">
                    <Checkbox checked={selectedTags.includes(tag)} onCheckedChange={() => toggleTag(tag)} />
                    <span>{tag}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3"><Label htmlFor="seat-search">Поиск</Label><Input id="seat-search" placeholder="Номер, зона, тег" value={query} onChange={(event) => setQuery(event.target.value)} /></div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setSelectedTags([]); setStatusFilter("all"); setQuery(""); }}>Сбросить</Button>
              <Button className="flex-1" disabled={!recommendedSeat} onClick={() => setSelectedSeatId(recommendedSeat?.id ?? null)}><Sparkles className="mr-2 h-4 w-4" /> Автовыбор</Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Карта мест</CardTitle>
                <CardDescription>{seatsQuery.isLoading ? "Загрузка мест..." : `Найдено ${filteredSeats.length} мест по текущим условиям`}</CardDescription>
              </div>
              {recommendedSeat ? <Button variant="outline" size="sm" onClick={() => setSelectedSeatId(recommendedSeat.id)}><Wand2 className="mr-2 h-4 w-4" /> Рекомендовать место {recommendedSeat.number}</Button> : null}
            </CardHeader>
            <CardContent className="space-y-5">
              {seatsQuery.error ? <Alert variant="destructive"><AlertDescription>{seatsQuery.error instanceof Error ? seatsQuery.error.message : "Не удалось загрузить места"}</AlertDescription></Alert> : null}
              {filteredSeats.length === 0 && !seatsQuery.isLoading ? (
                <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Нет доступных мест под выбранные фильтры. Попробуйте другой этаж, дату или снимите часть ограничений.</div>
              ) : groupedSeats.map(({ zone, seats: zoneSeats }) => (
                <div key={zone} className="space-y-3">
                  <div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Зона {zone}</h3><p className="text-xs text-muted-foreground">{zoneSeats.length} мест</p></div><div className="flex gap-2 text-xs text-muted-foreground"><span>Свободно {zoneSeats.filter((seat) => seat.status === "free").length}</span><span>Занято {zoneSeats.filter((seat) => seat.status === "occupied").length}</span></div></div>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8 2xl:grid-cols-10">
                    {zoneSeats.map((seat) => (
                      <button key={seat.id} onClick={() => setSelectedSeatId(seat.id)} disabled={seat.status === "unavailable"} className={cn("rounded-xl border px-3 py-4 text-left text-sm shadow-sm transition", seatStatusTone(seat.status), selectedSeatId === seat.id && "ring-2 ring-primary ring-offset-2")}>
                        <div className="text-base font-semibold">{seat.number}</div>
                        <div className="mt-1 text-[11px] opacity-80">{seatTypeLabel(seat)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card><CardHeader><CardTitle>Легенда статусов</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2 text-sm">{([ ["free", STATUS_LABELS.free], ["mine", STATUS_LABELS.mine], ["occupied", STATUS_LABELS.occupied], ["unavailable", STATUS_LABELS.unavailable], ] as const).map(([status, label]) => (<span key={status} className={cn("rounded-full border px-3 py-1", seatStatusTone(status))}>{label}</span>))}</CardContent></Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Выбранное место</CardTitle><CardDescription>Карточка места и сценарии бронирования</CardDescription></CardHeader>
            <CardContent>
              {selectedSeat ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3"><div><div className="text-2xl font-bold">Место {selectedSeat.number}</div><div className="mt-1 text-sm text-muted-foreground">Этаж {selectedSeat.floor} · Зона {selectedSeat.zone} · {seatTypeLabel(selectedSeat)}</div></div><span className={cn("rounded-full border px-3 py-1 text-xs", seatStatusTone(selectedSeat.status))}>{STATUS_LABELS[selectedSeat.status]}</span></div>
                  <div className="flex flex-wrap gap-2">{selectedSeat.tags.length > 0 ? selectedSeat.tags.map((tag) => (<Badge key={tag} variant="secondary">{tag}</Badge>)) : <Badge variant="outline">Без дополнительного оснащения</Badge>}</div>
                  <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground"><div className="flex items-center gap-2 font-medium text-foreground"><MapPin className="h-4 w-4" /> Описание</div><p className="mt-2">{seatSummary(selectedSeat)}</p></div>
                  <Separator />
                  {slotsQuery.isLoading ? (
                    <div className="text-sm text-muted-foreground">Загружаем свободные часы...</div>
                  ) : slotsQuery.data ? (
                    <div className="space-y-4">
                      <div><div className="mb-2 flex items-center gap-2 text-sm font-medium"><Clock3 className="h-4 w-4" /> Часы на {format(date, "d MMMM", { locale: ru })}</div><div className="grid grid-cols-3 gap-2">{slotsQuery.data.map((slot) => (<button key={slot.hour} disabled={slot.status !== "free"} onClick={() => toggleSlot(slot)} className={cn("rounded-lg border px-2 py-2 text-sm font-medium transition", slotTone[slot.status], selectedHours.includes(slot.hour) && slot.status === "free" && "ring-2 ring-primary ring-offset-1")}>{slot.hour}:00</button>))}</div></div>
                      <div className="rounded-xl border bg-muted/20 p-4 text-sm"><div className="font-medium">Выбранный интервал</div><div className="mt-1 text-muted-foreground">{selectionSummary(selectedHours)}</div>{selectedSegments.length > 1 ? <div className="mt-2 text-xs text-amber-700">Будет создано несколько интервалов: система разобьёт выбор на {selectedSegments.length} отдельных бронирования.</div> : null}</div>
                      <div className="space-y-2"><Label htmlFor="repeatWeeks">Повторять еженедельно</Label><select id="repeatWeeks" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={repeatWeeks} onChange={(event) => setRepeatWeeks(Number(event.target.value))}><option value={1}>Без повторения</option><option value={2}>2 недели</option><option value={4}>4 недели</option><option value={8}>8 недель</option></select></div>
                      <div className="flex flex-col gap-2"><Button disabled={selectedHours.length === 0 || bookingInProgress} onClick={handleCreateBooking}>{bookingInProgress ? "Создаём бронь..." : repeatWeeks > 1 ? "Создать серию" : "Забронировать"}</Button><Button variant="outline" disabled={!isToday(date) || bookingInProgress} onClick={handleWalkIn}>Занять место сейчас (walk-in)</Button></div>
                    </div>
                  ) : <div className="text-sm text-muted-foreground">Выберите место, чтобы увидеть свободные слоты.</div>}
                </div>
              ) : <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">Выберите место на карте или используйте автоподбор, чтобы открыть карточку и слоты бронирования.</div>}
            </CardContent>
          </Card>

          <Card><CardHeader><CardTitle>Мои ближайшие брони</CardTitle></CardHeader><CardContent className="space-y-3">{historyQuery.isLoading ? <div className="text-sm text-muted-foreground">Подгружаем историю...</div> : activeBookings.length > 0 ? activeBookings.map((booking) => (<div key={booking.id} className="rounded-xl border p-3"><div className="flex items-center justify-between gap-3"><div><div className="font-medium">{booking.date} · {booking.startHour}:00–{booking.endHour}:00</div><div className="text-sm text-muted-foreground">Этаж {booking.floor}, место {booking.seatNumber}, зона {booking.zone}</div></div><span className={cn("rounded-full border px-3 py-1 text-xs", statusPill(booking.status))}>{describeBookingStatus(booking.status)}</span></div></div>)) : <div className="text-sm text-muted-foreground">Активных бронирований пока нет.</div>}</CardContent></Card>
        </div>
      </div>
    </div>
  );
};

export default Booking;
