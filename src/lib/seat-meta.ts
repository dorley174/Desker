import type { Seat, SeatStatus } from "@/lib/types";

export const STATUS_LABELS: Record<SeatStatus, string> = {
  free: "Свободно",
  occupied: "Занято",
  mine: "Моя бронь",
  unavailable: "Недоступно",
};

export function seatTypeLabel(seat: Seat) {
  if (seat.tags.includes("Тихая зона")) return "Focus desk";
  if (seat.tags.includes("ТВ-панель")) return "Team spot";
  return "Desk";
}

export function seatSummary(seat: Seat) {
  if (seat.tags.length === 0) return "Базовое рабочее место";
  return seat.tags.join(" · ");
}

export function recommendationScore(seat: Seat, selectedTags: string[]) {
  const statusPenalty = seat.status === "free" ? 0 : seat.status === "mine" ? 5 : 50;
  const missingSelected = selectedTags.filter((tag) => !seat.tags.includes(tag)).length * 10;
  const bonus = seat.tags.length * -0.2 + seat.number * 0.01;
  return statusPenalty + missingSelected + bonus;
}

export function groupSeatsByZone(seats: Seat[]) {
  return [...new Set(seats.map((seat) => seat.zone))]
    .sort((a, b) => a.localeCompare(b, "ru"))
    .map((zone) => ({
      zone,
      seats: seats.filter((seat) => seat.zone === zone),
    }));
}

export function seatStatusTone(status: SeatStatus) {
  switch (status) {
    case "free":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "mine":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "occupied":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "unavailable":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}
