export type UserRole = "admin" | "employee";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: UserRole;
}

export type SeatStatus = "free" | "occupied" | "mine" | "unavailable";
export type SlotStatus = "free" | "occupied" | "mine";
export type BookingStatus = "completed" | "cancelled" | "no-show" | "active";

export interface Seat {
  id: string;
  number: number;
  zone: string;
  floor: number;
  tags: string[];
  status: SeatStatus;
}

export interface HourSlot {
  hour: number;
  status: SlotStatus;
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
  status: BookingStatus;
}
