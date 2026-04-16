import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Props {
  selected: string[];
  onChange: (tags: string[]) => void;
  statusFilter: "all" | "free" | "occupied";
  onStatusChange: (s: "all" | "free" | "occupied") => void;
  tags: string[];
}

const TagFilter = ({
  selected,
  onChange,
  statusFilter,
  onStatusChange,
  tags,
}: Props) => {
  const toggle = (tag: string) => {
    onChange(
      selected.includes(tag)
        ? selected.filter((t) => t !== tag)
        : [...selected, tag],
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <span className="mb-2 block text-xs font-semibold uppercase text-muted-foreground">
          Оснащение
        </span>
        <div className="space-y-2">
          {tags.map((tag) => (
            <div key={tag} className="flex items-center gap-2">
              <Checkbox
                id={tag}
                checked={selected.includes(tag)}
                onCheckedChange={() => toggle(tag)}
              />
              <Label htmlFor={tag} className="text-sm cursor-pointer">
                {tag}
              </Label>
            </div>
          ))}
        </div>
      </div>
      <div>
        <span className="mb-2 block text-xs font-semibold uppercase text-muted-foreground">
          Статус
        </span>
        <div className="flex flex-col gap-1">
          {(
            [
              ["all", "Все"],
              ["free", "Свободно"],
              ["occupied", "Занято"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              onClick={() => onStatusChange(val)}
              className={`rounded px-3 py-1 text-sm text-left transition ${statusFilter === val ? "bg-accent font-medium" : "hover:bg-accent/50"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TagFilter;
