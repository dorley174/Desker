import { addWeeks, format, isSameDay } from "date-fns";
import type { Booking, HourSlot } from "@/lib/types";

export const WORKDAY_START_HOUR = 8;
export const WORKDAY_END_HOUR = 20;

export function formatDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function isToday(date: Date) {
  return isSameDay(date, new Date());
}

export function buildWalkInHours(slots: HourSlot[], date: Date) {
  const hourNow = new Date().getHours();
  const startHour = Math.max(WORKDAY_START_HOUR, Math.min(hourNow, WORKDAY_END_HOUR - 1));
  const freeHours = new Set(slots.filter((slot) => slot.status === "free").map((slot) => slot.hour));

  if (!isToday(date) || startHour >= WORKDAY_END_HOUR || !freeHours.has(startHour)) {
    return [] as number[];
  }

  const picked = [startHour];
  if (startHour + 1 < WORKDAY_END_HOUR && freeHours.has(startHour + 1)) {
    picked.push(startHour + 1);
  }

  return picked;
}

export function normalizeSelectedHours(hours: number[]) {
  return [...new Set(hours)].sort((a, b) => a - b);
}

export function buildHourSegments(hours: number[]) {
  const normalized = normalizeSelectedHours(hours);
  if (normalized.length === 0) return [] as Array<{ start: number; end: number }>;

  const segments: Array<{ start: number; end: number }> = [];
  let segmentStart = normalized[0];
  let previous = normalized[0];

  for (let i = 1; i < normalized.length; i += 1) {
    const current = normalized[i];
    if (current === previous + 1) {
      previous = current;
      continue;
    }
    segments.push({ start: segmentStart, end: previous + 1 });
    segmentStart = current;
    previous = current;
  }

  segments.push({ start: segmentStart, end: previous + 1 });
  return segments;
}

export function selectionSummary(hours: number[]) {
  const segments = buildHourSegments(hours);
  if (segments.length === 0) return "Слоты не выбраны";
  return segments.map((segment) => `${segment.start}:00–${segment.end}:00`).join(", ");
}

export function describeBookingStatus(status: Booking["status"]) {
  switch (status) {
    case "active":
      return "Активна";
    case "completed":
      return "Завершена";
    case "cancelled":
      return "Отменена";
    case "no-show":
      return "No-show";
    default:
      return status;
  }
}

export function statusPill(status: Booking["status"]) {
  switch (status) {
    case "active":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "cancelled":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "no-show":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function buildRecurringDates(date: Date, occurrences: number) {
  return Array.from({ length: occurrences }, (_, index) => formatDateKey(addWeeks(date, index)));
}
