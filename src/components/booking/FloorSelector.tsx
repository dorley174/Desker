import { cn } from "@/lib/utils";

interface Props {
  selected: number;
  onSelect: (floor: number) => void;
  floors: number[];
}

const FloorSelector = ({ selected, onSelect, floors }: Props) => (
  <div className="flex flex-col gap-1">
    <span className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
      Этаж
    </span>
    {floors.map((f) => (
      <button
        key={f}
        onClick={() => onSelect(f)}
        className={cn(
          "rounded-lg px-4 py-2 text-sm font-medium transition",
          f === selected
            ? "bg-primary text-primary-foreground shadow"
            : "hover:bg-accent text-foreground",
        )}
      >
        {f}
      </button>
    ))}
  </div>
);

export default FloorSelector;
