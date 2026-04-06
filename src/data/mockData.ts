// TODO: replace with API calls to Supabase

export interface Seat {
  id: string;
  number: number;
  zone: string;
  floor: number;
  tags: string[];
  status: "free" | "occupied" | "mine" | "unavailable";
}

export interface Booking {
  id: string;
  seatId: string;
  floor: number;
  seatNumber: number;
  zone: string;
  date: string;
  startHour: number;
  endHour: number;
  status: "completed" | "cancelled" | "no-show" | "active";
}

export interface HourSlot {
  hour: number;
  status: "free" | "occupied" | "mine";
}

export const FLOORS = [1, 2, 3, 4, 5, 6];

export const EQUIPMENT_TAGS = [
  "Принтер",
  "Доска",
  "2+ мониторов",
  "ТВ-панель",
  "Кондиционер",
  "Тихая зона",
];

const zones = ["A", "B", "C", "D"];

function generateSeats(floor: number): Seat[] {
  const seats: Seat[] = [];
  let id = 1;
  for (const zone of zones) {
    const count = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const statuses: Seat["status"][] = ["free", "free", "free", "occupied", "mine", "unavailable"];
      seats.push({
        id: `${floor}-${zone}-${id}`,
        number: id,
        zone,
        floor,
        tags: EQUIPMENT_TAGS.filter(() => Math.random() > 0.65),
        status: statuses[Math.floor(Math.random() * statuses.length)],
      });
      id++;
    }
  }
  return seats;
}

export const SEATS_BY_FLOOR: Record<number, Seat[]> = Object.fromEntries(
  FLOORS.map((f) => [f, generateSeats(f)])
);

export function generateSlots(seatId: string): HourSlot[] {
  return Array.from({ length: 12 }, (_, i) => ({
    hour: 8 + i,
    status: (["free", "free", "occupied", "mine"] as HourSlot["status"][])[
      Math.floor(Math.random() * 4)
    ],
  }));
}

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: "b1",
    seatId: "1-A-3",
    floor: 1,
    seatNumber: 3,
    zone: "A",
    date: "2026-02-25",
    startHour: 9,
    endHour: 12,
    status: "completed",
  },
  {
    id: "b2",
    seatId: "3-B-7",
    floor: 3,
    seatNumber: 7,
    zone: "B",
    date: "2026-02-26",
    startHour: 14,
    endHour: 17,
    status: "cancelled",
  },
  {
    id: "b3",
    seatId: "2-C-5",
    floor: 2,
    seatNumber: 5,
    zone: "C",
    date: "2026-02-27",
    startHour: 10,
    endHour: 13,
    status: "active",
  },
  {
    id: "b4",
    seatId: "5-D-12",
    floor: 5,
    seatNumber: 12,
    zone: "D",
    date: "2026-02-20",
    startHour: 8,
    endHour: 10,
    status: "no-show",
  },
];
