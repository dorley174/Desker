import { useState } from "react";
import { Seat, generateSlots, HourSlot } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  seat: Seat;
  onClose: () => void;
}

const slotColor: Record<HourSlot["status"], string> = {
  free: "bg-emerald-100 border-emerald-400 text-emerald-800 hover:bg-emerald-300 cursor-pointer",
  occupied: "bg-red-100 border-red-300 text-red-600 cursor-not-allowed",
  mine: "bg-blue-100 border-blue-400 text-blue-800",
};

const SlotPicker = ({ seat, onClose }: Props) => {
  const [slots] = useState(() => generateSlots(seat.id));
  const [selected, setSelected] = useState<number[]>([]);

  const toggleSlot = (slot: HourSlot) => {
    if (slot.status !== "free") return;
    setSelected((prev) =>
      prev.includes(slot.hour) ? prev.filter((h) => h !== slot.hour) : [...prev, slot.hour]
    );
  };

  const handleBook = () => {
    // TODO: replace with API call
    toast.success(`Забронировано: место ${seat.number} (зона ${seat.zone}), ${selected.sort().map((h) => `${h}:00`).join(", ")}`);
    onClose();
  };

  return (
    <div className="rounded-xl border bg-card p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Место {seat.number} · Зона {seat.zone}</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
      </div>
      {seat.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {seat.tags.map((t) => (
            <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-xs">{t}</span>
          ))}
        </div>
      )}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {slots.map((slot) => (
          <button
            key={slot.hour}
            disabled={slot.status === "occupied"}
            onClick={() => toggleSlot(slot)}
            className={cn(
              "rounded-md border px-2 py-1.5 text-xs font-medium transition",
              slotColor[slot.status],
              selected.includes(slot.hour) && slot.status === "free" && "ring-2 ring-primary"
            )}
          >
            {slot.hour}:00
          </button>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Button onClick={handleBook} disabled={selected.length === 0} className="flex-1">
          Забронировать ({selected.length})
        </Button>
        <Button variant="outline" onClick={onClose}>Отмена</Button>
      </div>
    </div>
  );
};

export default SlotPicker;
