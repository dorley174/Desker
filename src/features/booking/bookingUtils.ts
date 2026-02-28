import type { Reservation, ResourceStatus } from '@/domain/types';

export function toDateKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function parseHm(hm: string) {
  const [h, m] = hm.split(':').map((x) => Number(x));
  return { h, m };
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function buildSlots(dateKey: string, workdayStart: string, workdayEnd: string, slotMinutes: number) {
  const { h: sh, m: sm } = parseHm(workdayStart);
  const { h: eh, m: em } = parseHm(workdayEnd);

  const start = new Date(`${dateKey}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`);
  const end = new Date(`${dateKey}T${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`);

  const slots: { startAt: string; endAt: string; label: string; }[] = [];
  for (let t = start; t < end; t = addMinutes(t, slotMinutes)) {
    const t2 = addMinutes(t, slotMinutes);
    slots.push({
      startAt: toLocalIso(t),
      endAt: toLocalIso(t2),
      label: `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`,
    });
  }
  return slots;
}

export function toLocalIso(d: Date) {
  // ISO-like string without timezone offset.
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

export function overlaps(aStartIso: string, aEndIso: string, bStartIso: string, bEndIso: string) {
  const aStart = new Date(aStartIso);
  const aEnd = new Date(aEndIso);
  const bStart = new Date(bStartIso);
  const bEnd = new Date(bEndIso);
  return aStart < bEnd && bStart < aEnd;
}

export function isBlockingReservation(r: Reservation) {
  return r.status !== 'CANCELLED' && r.status !== 'COMPLETED' && r.status !== 'NO_SHOW';
}

export function effectiveStatusForInterval(
  base: ResourceStatus,
  reservationsForResource: Reservation[],
  interval: { startAt: string; endAt: string } | null
): ResourceStatus {
  if (base === 'UNAVAILABLE') return 'UNAVAILABLE';

  if (!interval) return base;

  for (const r of reservationsForResource) {
    if (!isBlockingReservation(r)) continue;
    if (overlaps(interval.startAt, interval.endAt, r.startAt, r.endAt)) {
      // if someone checked in (walk-in), treat as occupied
      if (r.status === 'CHECKED_IN') return 'OCCUPIED';
      return 'RESERVED';
    }
  }

  return 'FREE';
}
