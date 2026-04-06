import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import FloorSelector from "@/components/booking/FloorSelector";
import TagFilter from "@/components/booking/TagFilter";
import SeatMap from "@/components/booking/SeatMap";
import SlotPicker from "@/components/booking/SlotPicker";
import { SEATS_BY_FLOOR, Seat } from "@/data/mockData";

const Booking = () => {
  const [floor, setFloor] = useState(1);
  const [date, setDate] = useState<Date>(new Date());
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "free" | "occupied">("all");
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);

  const filteredSeats = useMemo(() => {
    let seats = SEATS_BY_FLOOR[floor] || [];
    if (selectedTags.length > 0) {
      seats = seats.filter((s) => selectedTags.every((t) => s.tags.includes(t)));
    }
    if (statusFilter === "free") seats = seats.filter((s) => s.status === "free");
    if (statusFilter === "occupied") seats = seats.filter((s) => s.status === "occupied" || s.status === "mine");
    return seats;
  }, [floor, selectedTags, statusFilter]);

  return (
    <div className="mx-auto flex max-w-7xl gap-4 px-4 py-6">
      {/* Left sidebar — floors */}
      <aside className="hidden w-20 shrink-0 md:block">
        <FloorSelector selected={floor} onSelect={(f) => { setFloor(f); setSelectedSeat(null); }} />
      </aside>

      {/* Filters */}
      <aside className="hidden w-44 shrink-0 lg:block">
        <TagFilter selected={selectedTags} onChange={setSelectedTags} statusFilter={statusFilter} onStatusChange={setStatusFilter} />
      </aside>

      {/* Main area */}
      <div className="flex-1 space-y-4">
        {/* Date picker + mobile floor selector */}
        <div className="flex flex-wrap items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal", !date && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP", { locale: ru }) : "Выберите дату"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          {/* Mobile floor chips */}
          <div className="flex gap-1 md:hidden">
            {[1, 2, 3, 4, 5, 6].map((f) => (
              <button
                key={f}
                onClick={() => { setFloor(f); setSelectedSeat(null); }}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition",
                  f === floor ? "bg-primary text-primary-foreground" : "bg-secondary"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <SeatMap seats={filteredSeats} selectedSeat={selectedSeat} onSelect={setSelectedSeat} />

        {selectedSeat && (
          <SlotPicker seat={selectedSeat} onClose={() => setSelectedSeat(null)} />
        )}
      </div>
    </div>
  );
};

export default Booking;
