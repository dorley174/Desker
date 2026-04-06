import { Seat } from "@/data/mockData";
import { cn } from "@/lib/utils";

interface Props {
  seats: Seat[];
  selectedSeat: Seat | null;
  onSelect: (seat: Seat) => void;
}

const statusColors: Record<Seat["status"], string> = {
  free: "bg-emerald-100 border-emerald-400 text-emerald-800 hover:bg-emerald-200",
  occupied: "bg-red-100 border-red-300 text-red-700",
  mine: "bg-blue-100 border-blue-400 text-blue-800 hover:bg-blue-200",
  unavailable: "bg-muted border-border text-muted-foreground opacity-50 cursor-not-allowed",
};

const SeatMap = ({ seats, selectedSeat, onSelect }: Props) => {
  const zones = [...new Set(seats.map((s) => s.zone))].sort();

  return (
    <div className="space-y-6">
      {zones.map((zone) => (
        <div key={zone}>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Зона {zone}</h3>
          <div className="flex flex-wrap gap-2">
            {seats
              .filter((s) => s.zone === zone)
              .map((seat) => (
                <button
                  key={seat.id}
                  disabled={seat.status === "unavailable"}
                  onClick={() => onSelect(seat)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-md border text-xs font-semibold transition",
                    statusColors[seat.status],
                    selectedSeat?.id === seat.id && "ring-2 ring-primary ring-offset-2"
                  )}
                >
                  {seat.number}
                </button>
              ))}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-4 pt-4 text-xs">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded border border-emerald-400 bg-emerald-100" /> Свободно</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded border border-red-300 bg-red-100" /> Занято</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded border border-blue-400 bg-blue-100" /> Моя бронь</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded border bg-muted opacity-50" /> Недоступно</span>
      </div>
    </div>
  );
};

export default SeatMap;
