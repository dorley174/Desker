import type { Booking, HourSlot, Seat, User, UserRole } from "@/lib/types";

declare global {
  interface Window {
    __APP_CONFIG__?: {
      API_BASE_URL?: string;
    };
  }
}

const runtimeApiBase = typeof window !== "undefined" ? window.__APP_CONFIG__?.API_BASE_URL : undefined;
const defaultApiBase =
  typeof window !== "undefined" && window.location.port === "5173"
    ? "http://localhost:8080/api/v1"
    : "/team-6-api/api/v1";
const API_BASE = runtimeApiBase || import.meta.env.VITE_API_URL || defaultApiBase;
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

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function extractArray<T = unknown>(payload: unknown, candidateKeys: string[] = []): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (!isRecord(payload)) return [];
  for (const key of candidateKeys) {
    const value = payload[key];
    if (Array.isArray(value)) return value as T[];
  }
  return [];
}

function normalizeUser(raw: unknown): User {
  const source = isRecord(raw) && isRecord(raw.user) ? raw.user : raw;
  const record = isRecord(source) ? source : {};
  const role = asString(record.role, "employee") as UserRole;
  return {
    id: asString(record.id),
    email: asString(record.email),
    firstName: asString(record.firstName || record.first_name),
    lastName: asString(record.lastName || record.last_name),
    role: role === "admin" ? "admin" : "employee",
  };
}

function normalizeSeat(raw: unknown): Seat {
  const record = isRecord(raw) ? raw : {};
  const status = asString(record.status, "unavailable");
  return {
    id: asString(record.id),
    number: asNumber(record.number),
    zone: asString(record.zone),
    floor: asNumber(record.floor),
    tags: asStringArray(record.tags),
    status: status === "free" || status === "occupied" || status === "mine" ? status : "unavailable",
  };
}

function normalizeSlot(raw: unknown): HourSlot {
  const record = isRecord(raw) ? raw : {};
  const status = asString(record.status, "occupied");
  return {
    hour: asNumber(record.hour),
    status: status === "free" || status === "mine" ? status : "occupied",
  };
}

function normalizeBooking(raw: unknown): Booking {
  const record = isRecord(raw) ? raw : {};
  const status = asString(record.status, "completed");
  return {
    id: asString(record.id),
    seatId: asString(record.seatId || record.seat_id),
    floor: asNumber(record.floor),
    seatNumber: asNumber(record.seatNumber || record.seat_number),
    zone: asString(record.zone),
    date: asString(record.date),
    startHour: asNumber(record.startHour || record.start_hour),
    endHour: asNumber(record.endHour || record.end_hour),
    status: status === "active" || status === "cancelled" || status === "no-show" ? status : "completed",
  };
}

function normalizeHistoryResponse(payload: unknown): HistoryResponse {
  const record = isRecord(payload) ? payload : {};
  const items = extractArray(record, ["items", "data", "bookings"]).map(normalizeBooking);
  return {
    items,
    total: asNumber(record.total, items.length),
    page: asNumber(record.page, 1),
    pageSize: asNumber(record.pageSize || record.page_size, items.length || 50),
  };
}

function normalizeAuthResponse(payload: unknown): AuthResponse {
  const record = isRecord(payload) ? payload : {};
  return {
    token: asString(record.token),
    user: normalizeUser(record.user ?? record),
  };
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
    const message = payload as ApiErrorPayload | string | null;
    if (typeof message === "string") {
      throw new Error(message);
    }
    throw new Error(message?.error || message?.message || `Request failed with status ${response.status}`);
  }

  return payload as T;
}

export const api = {
  async login(email: string, password: string) {
    const payload = await request<unknown>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    return normalizeAuthResponse(payload);
  },
  async register(payload: { email: string; firstName: string; lastName: string; password: string; inviteCode?: string }) {
    const response = await request<unknown>("/auth/register", { method: "POST", body: JSON.stringify(payload) });
    return normalizeAuthResponse(response);
  },
  async forgotPassword(email: string) {
    return request<{ message: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
  },
  async resetPassword(payload: { email: string; code: string; newPassword: string }) {
    return request<{ message: string }>("/auth/reset-password", { method: "POST", body: JSON.stringify(payload) });
  },
  async me() {
    const payload = await request<unknown>("/auth/me");
    return normalizeUser(payload);
  },
  async updateMe(payload: { firstName?: string; lastName?: string; password?: string }) {
    const response = await request<unknown>("/users/me", { method: "PUT", body: JSON.stringify(payload) });
    return normalizeUser(response);
  },
  async floors() {
    const payload = await request<unknown>("/floors");
    return extractArray<number>(payload, ["floors", "items", "data"]).filter((item): item is number => typeof item === "number" && Number.isFinite(item));
  },
  async equipmentTags() {
    const payload = await request<unknown>("/equipment-tags");
    return extractArray<string>(payload, ["tags", "items", "data"]).filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  },
  async seats(params: SeatQueryParams) {
    const query = new URLSearchParams({ floor: String(params.floor), date: params.date, status: params.status || "all" });
    if (params.tags && params.tags.length > 0) query.set("tags", params.tags.join(","));
    const payload = await request<unknown>(`/seats?${query.toString()}`);
    return extractArray(payload, ["seats", "items", "data"]).map(normalizeSeat);
  },
  async seatSlots(seatId: string, date: string) {
    const payload = await request<unknown>(`/seats/${seatId}/slots?date=${encodeURIComponent(date)}`);
    return extractArray(payload, ["slots", "items", "data"]).map(normalizeSlot);
  },
  async createBooking(payload: CreateBookingPayload) {
    const response = await request<unknown>("/bookings", { method: "POST", body: JSON.stringify(payload) });
    return { items: extractArray(response, ["items", "data", "bookings"]).map(normalizeBooking) };
  },
  async history(params?: { page?: number; pageSize?: number; status?: string; sortBy?: string; sortOrder?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("pageSize", String(params.pageSize));
    if (params?.status) query.set("status", params.status);
    if (params?.sortBy) query.set("sortBy", params.sortBy);
    if (params?.sortOrder) query.set("sortOrder", params.sortOrder);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const payload = await request<unknown>(`/bookings/history${suffix}`);
    return normalizeHistoryResponse(payload);
  },
  async cancelBooking(bookingId: string) {
    return request<{ status: string }>(`/bookings/${bookingId}`, { method: "DELETE" });
  },
  async setSeatAvailability(seatId: string, available: boolean) {
    return request<{ status: string }>(`/admin/seats/${seatId}/availability`, {
      method: "PATCH",
      body: JSON.stringify({ available }),
    });
  },
};
