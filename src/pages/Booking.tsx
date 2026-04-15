import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Seat } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import FloorSelector from "@/components/booking/FloorSelector";
import TagFilter from "@/components/booking/TagFilter";
import SeatMap from "@/components/booking/SeatMap";
import SlotPicker from "@/components/booking/SlotPicker";

const Booking = () => {
  const [floor, setFloor] = useState(1);
  const [date, setDate] = useState<Date>(new Date());
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "free" | "occupied">(
    "all",
  );
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const queryClient = useQueryClient();
  const dateString = format(date, "yyyy-MM-dd");

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

  const slotsQuery = useQuery({
    queryKey: ["seat-slots", selectedSeat?.id, dateString],
    queryFn: () => api.seatSlots(selectedSeat!.id, dateString),
    enabled: Boolean(selectedSeat),
  });

  useEffect(() => {
    setSelectedSeat(null);
  }, [floor, dateString, statusFilter, selectedTags.join("|")]);

  const floors = floorsQuery.data ?? [1, 2, 3, 4, 5, 6];
  const tags = tagsQuery.data ?? [];
  const seats = seatsQuery.data ?? [];

  return (
    <div className="mx-auto flex max-w-7xl gap-4 px-4 py-6">
      <aside className="hidden w-20 shrink-0 md:block">
        <FloorSelector floors={floors} selected={floor} onSelect={setFloor} />
      </aside>

      <aside className="hidden w-44 shrink-0 lg:block">
        <TagFilter
          tags={tags}
          selected={selectedTags}
          onChange={setSelectedTags}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
        />
      </aside>

      <div className="flex-1 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP", { locale: ru }) : "Выберите дату"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {(floorsQuery.isLoading ||
            tagsQuery.isLoading ||
            seatsQuery.isLoading) && (
            <span className="text-sm text-muted-foreground">
              Загрузка данных...
            </span>
          )}

          <div className="flex gap-1 md:hidden">
            {floors.map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFloor(f);
                  setSelectedSeat(null);
                }}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition",
                  f === floor
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <SeatMap
          seats={seats}
          selectedSeat={selectedSeat}
          onSelect={setSelectedSeat}
        />

        {selectedSeat && slotsQuery.data && (
          <SlotPicker
            seat={selectedSeat}
            date={dateString}
            slots={slotsQuery.data}
            onClose={() => setSelectedSeat(null)}
            onBooked={async () => {
              await queryClient.invalidateQueries({ queryKey: ["seats"] });
              await queryClient.invalidateQueries({ queryKey: ["seat-slots"] });
              await queryClient.invalidateQueries({
                queryKey: ["bookings-history"],
              });
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Booking;
