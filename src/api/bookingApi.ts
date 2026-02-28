import { API_BASE_URL, USE_MOCK_API } from '@/api/config';
import { fetchJson } from '@/api/http';
import type { OfficePolicy, Reservation, ReservationSource, Resource } from '@/domain/types';
import { loadMockDb, saveMockDb } from '@/mock/mockDb';

export type ListResourcesInput = {
  floorNumber: number;
};

export type ListReservationsInput = {
  date: string; // YYYY-MM-DD
  floorNumber?: number;
};

export type CreateReservationInput = {
  resourceId: string;
  userId: string;
  startAt: string; // ISO (local without timezone for mock)
  endAt: string; // ISO
  source: ReservationSource;
};

export interface BookingApi {
  getPolicy(): Promise<OfficePolicy>;
  listFloors(): Promise<number[]>;
  listResources(input: ListResourcesInput): Promise<Resource[]>;
  listReservations(input: ListReservationsInput): Promise<Reservation[]>;
  listUserReservations(userId: string): Promise<Reservation[]>;
  createReservation(input: CreateReservationInput): Promise<Reservation>;
  cancelReservation(reservationId: string, userId: string): Promise<void>;
  checkIn(reservationId: string, userId: string): Promise<void>;
  completeReservation(reservationId: string, userId: string): Promise<void>;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

function isBlockingStatus(status: Reservation['status']) {
  return status !== 'CANCELLED' && status !== 'COMPLETED' && status !== 'NO_SHOW';
}

function uuid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now());
}

const mockBookingApi: BookingApi = {
  async getPolicy() {
    return loadMockDb().policy;
  },

  async listFloors() {
    return [1, 2, 3, 4, 5, 6];
  },

  async listResources(input) {
    const db = loadMockDb();
    return db.resources.filter((r) => r.floorNumber === input.floorNumber);
  },

  async listReservations(input) {
    const db = loadMockDb();
    const prefix = `${input.date}T`;
    const byDate = db.reservations.filter((r) => r.startAt.startsWith(prefix));

    if (!input.floorNumber) return byDate;

    const resourceIdsOnFloor = new Set(db.resources.filter((r) => r.floorNumber === input.floorNumber).map((r) => r.id));
    return byDate.filter((r) => resourceIdsOnFloor.has(r.resourceId));
  },

  async listUserReservations(userId) {
    const db = loadMockDb();
    return db.reservations.filter((r) => r.userId === userId);
  },

  async createReservation(input) {
    const db = loadMockDb();

    const resource = db.resources.find((r) => r.id === input.resourceId);
    if (!resource) throw new Error('Место не найдено');
    if (!resource.isActive || resource.status === 'UNAVAILABLE') throw new Error('Место недоступно');

    const start = new Date(input.startAt);
    const end = new Date(input.endAt);
    if (!(start < end)) throw new Error('Некорректный интервал');

    // Conflict check.
    for (const r of db.reservations) {
      if (r.resourceId !== input.resourceId) continue;
      if (!isBlockingStatus(r.status)) continue;
      const rs = new Date(r.startAt);
      const re = new Date(r.endAt);
      if (overlaps(start, end, rs, re)) {
        throw new Error('Место уже занято');
      }
    }

    const reservation: Reservation = {
      id: uuid(),
      resourceId: input.resourceId,
      userId: input.userId,
      startAt: input.startAt,
      endAt: input.endAt,
      source: input.source,
      status: input.source === 'WALK_IN' ? 'CHECKED_IN' : 'CONFIRMED',
    };

    const nextDb = { ...db, reservations: [...db.reservations, reservation] };
    saveMockDb(nextDb);
    return reservation;
  },

  async cancelReservation(reservationId, userId) {
    const db = loadMockDb();
    const r = db.reservations.find((x) => x.id === reservationId);
    if (!r) throw new Error('Бронь не найдена');
    if (r.userId !== userId) throw new Error('Нет прав на отмену');

    const nextDb = {
      ...db,
      reservations: db.reservations.map((x) => (x.id === reservationId ? { ...x, status: 'CANCELLED' } : x)),
    };
    saveMockDb(nextDb);
  },

  async checkIn(reservationId, userId) {
    const db = loadMockDb();
    const r = db.reservations.find((x) => x.id === reservationId);
    if (!r) throw new Error('Бронь не найдена');
    if (r.userId !== userId) throw new Error('Нет прав на check-in');

    const nextDb = {
      ...db,
      reservations: db.reservations.map((x) => (x.id === reservationId ? { ...x, status: 'CHECKED_IN' } : x)),
    };
    saveMockDb(nextDb);
  },

  async completeReservation(reservationId, userId) {
    const db = loadMockDb();
    const r = db.reservations.find((x) => x.id === reservationId);
    if (!r) throw new Error('Бронь не найдена');
    if (r.userId !== userId) throw new Error('Нет прав на завершение');

    const nextDb = {
      ...db,
      reservations: db.reservations.map((x) => (x.id === reservationId ? { ...x, status: 'COMPLETED' } : x)),
    };
    saveMockDb(nextDb);
  },
};

const realBookingApi: BookingApi = {
  async getPolicy() {
    /** BACKEND INTEGRATION (placeholder): GET /office/policy */
    return await fetchJson<OfficePolicy>(`${API_BASE_URL}/office/policy`);
  },

  async listFloors() {
    /** BACKEND INTEGRATION (placeholder): GET /floors */
    return await fetchJson<number[]>(`${API_BASE_URL}/floors`);
  },

  async listResources(input) {
    /** BACKEND INTEGRATION (placeholder): GET /resources?floor= */
    return await fetchJson<Resource[]>(`${API_BASE_URL}/resources?floor=${input.floorNumber}`);
  },

  async listReservations(input) {
    /** BACKEND INTEGRATION (placeholder): GET /reservations?date=YYYY-MM-DD&floor= */
    const q = new URLSearchParams({ date: input.date });
    if (input.floorNumber) q.set('floor', String(input.floorNumber));
    return await fetchJson<Reservation[]>(`${API_BASE_URL}/reservations?${q.toString()}`);
  },

  async listUserReservations(userId) {
    /** BACKEND INTEGRATION (placeholder): GET /reservations/my */
    return await fetchJson<Reservation[]>(`${API_BASE_URL}/reservations/my?userId=${userId}`);
  },

  async createReservation(input) {
    /** BACKEND INTEGRATION (placeholder): POST /reservations */
    return await fetchJson<Reservation>(`${API_BASE_URL}/reservations`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async cancelReservation(reservationId, userId) {
    /** BACKEND INTEGRATION (placeholder): POST /reservations/:id/cancel */
    await fetchJson<void>(`${API_BASE_URL}/reservations/${reservationId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  async checkIn(reservationId, userId) {
    /** BACKEND INTEGRATION (placeholder): POST /reservations/:id/check-in */
    await fetchJson<void>(`${API_BASE_URL}/reservations/${reservationId}/check-in`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  async completeReservation(reservationId, userId) {
    /** BACKEND INTEGRATION (placeholder): POST /reservations/:id/complete */
    await fetchJson<void>(`${API_BASE_URL}/reservations/${reservationId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },
};

export const bookingApi: BookingApi = USE_MOCK_API ? mockBookingApi : realBookingApi;
