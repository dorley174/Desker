import type { Booking, HourSlot, Seat, User } from "@/lib/types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080/api/v1";
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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const token = getStoredToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("Content-Type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    const message = (payload as ApiErrorPayload | string | null);
    if (typeof message === "string") {
      throw new Error(message);
    }
    throw new Error(message?.error || message?.message || `Request failed with status ${response.status}`);
  }

  return payload as T;
}

export const api = {
  async login(email: string, password: string) {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  async register(payload: { email: string; firstName: string; lastName: string; password: string; inviteCode?: string }) {
    return request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async forgotPassword(email: string) {
    return request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },
  async me() {
    return request<User>("/auth/me");
  },
  async updateMe(payload: { firstName?: string; lastName?: string; password?: string }) {
    return request<User>("/users/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  async floors() {
    return request<number[]>("/floors");
  },
  async equipmentTags() {
    return request<string[]>("/equipment-tags");
  },
  async seats(params: SeatQueryParams) {
    const query = new URLSearchParams({
      floor: String(params.floor),
      date: params.date,
      status: params.status || "all",
    });
    if (params.tags && params.tags.length > 0) {
      query.set("tags", params.tags.join(","));
    }
    return request<Seat[]>(`/seats?${query.toString()}`);
  },
  async seatSlots(seatId: string, date: string) {
    return request<HourSlot[]>(`/seats/${seatId}/slots?date=${encodeURIComponent(date)}`);
  },
  async createBooking(payload: CreateBookingPayload) {
    return request<{ items: Booking[] }>("/bookings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async history(params?: { page?: number; pageSize?: number; status?: string; sortBy?: string; sortOrder?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("pageSize", String(params.pageSize));
    if (params?.status) query.set("status", params.status);
    if (params?.sortBy) query.set("sortBy", params.sortBy);
    if (params?.sortOrder) query.set("sortOrder", params.sortOrder);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request<HistoryResponse>(`/bookings/history${suffix}`);
  },
  async cancelBooking(bookingId: string) {
    return request<{ status: string }>(`/bookings/${bookingId}`, {
      method: "DELETE",
    });
  },
};
