import type { Booking, HourSlot, Seat, User } from "@/lib/types";
import { mockApi } from "@/lib/mock-backend";

const TOKEN_KEY = "desker_token";

export interface ApiErrorPayload {
  error?: string;
  message?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SeatQueryParams {
  floor: number;
  date: string;
  tags?: string[];
  status?: "all" | "free" | "occupied";
}

export interface CreateBookingPayload {
  seatId: string;
  date: string;
  hours: number[];
}

export interface HistoryResponse {
  items: Booking[];
  total: number;
  page: number;
  pageSize: number;
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
}

export const api = {
  async login(email: string, password: string) {
    return mockApi.login(email, password);
  },
  async register(payload: { email: string; firstName: string; lastName: string; password: string; inviteCode?: string }) {
    return mockApi.register(payload);
  },
  async forgotPassword(email: string) {
    return mockApi.forgotPassword(email);
  },
  async resetPassword(payload: { email: string; code: string; newPassword: string }) {
    return mockApi.resetPassword(payload);
  },
  async me() {
    return mockApi.me();
  },
  async updateMe(payload: { firstName?: string; lastName?: string; password?: string }) {
    return mockApi.updateMe(payload);
  },
  async floors() {
    return mockApi.floors();
  },
  async equipmentTags() {
    return mockApi.equipmentTags();
  },
  async seats(params: SeatQueryParams) {
    return mockApi.seats(params);
  },
  async seatSlots(seatId: string, date: string) {
    return mockApi.seatSlots(seatId, date) as Promise<HourSlot[]>;
  },
  async createBooking(payload: CreateBookingPayload) {
    return mockApi.createBooking(payload);
  },
  async history(params?: { page?: number; pageSize?: number; status?: string; sortBy?: string; sortOrder?: string }) {
    return mockApi.history(params);
  },
  async cancelBooking(bookingId: string) {
    return mockApi.cancelBooking(bookingId);
  },
  async resetDemoData() {
    return mockApi.resetDemoData();
  },
};

export type { Seat, HourSlot, User };
