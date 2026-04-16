import type { Booking, HourSlot, Seat, User, UserRole } from "@/lib/types";

const DB_KEY = "desker_mock_db";
const TOKEN_PREFIX = "mock-token:";
const OFFICE_START_HOUR = 8;
const OFFICE_END_HOUR = 20;

interface StoredUser extends User {
  password: string;
  resetCode?: string;
}

interface InviteCode {
  code: string;
  role: UserRole;
  label: string;
}

interface StoredBooking extends Booking {
  userId: string;
  createdAt: string;
}

interface MockDatabase {
  users: StoredUser[];
  invites: InviteCode[];
  floors: number[];
  seats: Seat[];
  bookings: StoredBooking[];
}

interface HistoryParams {
  page?: number;
  pageSize?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function uid(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function pause(ms = 180) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeUser(user: StoredUser): User {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

function seedSeats(): Seat[] {
  const configs = [
    { zone: "Open Space", tags: ["monitor", "dock"] },
    { zone: "Focus Zone", tags: ["monitor", "quiet", "window"] },
    { zone: "Team Zone", tags: ["monitor", "dock", "whiteboard"] },
    { zone: "Open Space", tags: ["monitor", "adjustable_desk"] },
    { zone: "Open Space", tags: ["dock", "window"] },
    { zone: "Focus Zone", tags: ["quiet", "accessible"] },
    { zone: "Meeting Area", tags: ["camera", "whiteboard", "tv_panel"] },
    { zone: "Open Space", tags: ["monitor", "keyboard", "mouse"] },
  ];

  const seats: Seat[] = [];

  for (let floor = 1; floor <= 6; floor += 1) {
    configs.forEach((config, index) => {
      const number = floor * 100 + index + 1;
      const isUnavailable = floor === 3 && index === 5;
      seats.push({
        id: `F${floor}-S${index + 1}`,
        number,
        zone: config.zone,
        floor,
        tags: [...config.tags],
        status: isUnavailable ? "unavailable" : "free",
      });
    });
  }

  return seats;
}

function createSeedDatabase(): MockDatabase {
  const today = new Date();
  const hour = today.getHours();
  const startHour = Math.min(Math.max(hour + 1, 9), 17);
  const endHour = Math.min(startHour + 2, OFFICE_END_HOUR);

  const users: StoredUser[] = [
    {
      id: "user-demo",
      email: "user@desker.io",
      firstName: "Demo",
      lastName: "Employee",
      role: "employee",
      password: "user123",
    },
    {
      id: "admin-demo",
      email: "admin@desker.io",
      firstName: "Demo",
      lastName: "Admin",
      role: "admin",
      password: "admin123",
    },
  ];

  const bookings: StoredBooking[] = [
    {
      id: uid("booking"),
      seatId: "F1-S2",
      floor: 1,
      seatNumber: 102,
      zone: "Focus Zone",
      date: dateKey(today),
      startHour,
      endHour,
      status: "active",
      userId: "user-demo",
      createdAt: new Date().toISOString(),
    },
    {
      id: uid("booking"),
      seatId: "F1-S3",
      floor: 1,
      seatNumber: 103,
      zone: "Team Zone",
      date: dateKey(today),
      startHour: Math.min(startHour + 1, 18),
      endHour: Math.min(endHour + 2, OFFICE_END_HOUR),
      status: "active",
      userId: "admin-demo",
      createdAt: new Date().toISOString(),
    },
    {
      id: uid("booking"),
      seatId: "F2-S4",
      floor: 2,
      seatNumber: 204,
      zone: "Open Space",
      date: dateKey(addDays(today, 1)),
      startHour: 10,
      endHour: 14,
      status: "active",
      userId: "user-demo",
      createdAt: new Date().toISOString(),
    },
    {
      id: uid("booking"),
      seatId: "F4-S1",
      floor: 4,
      seatNumber: 401,
      zone: "Open Space",
      date: dateKey(addDays(today, -1)),
      startHour: 9,
      endHour: 12,
      status: "active",
      userId: "user-demo",
      createdAt: new Date().toISOString(),
    },
    {
      id: uid("booking"),
      seatId: "F5-S7",
      floor: 5,
      seatNumber: 507,
      zone: "Meeting Area",
      date: dateKey(addDays(today, -3)),
      startHour: 11,
      endHour: 12,
      status: "no-show",
      userId: "user-demo",
      createdAt: new Date().toISOString(),
    },
    {
      id: uid("booking"),
      seatId: "F2-S6",
      floor: 2,
      seatNumber: 206,
      zone: "Focus Zone",
      date: dateKey(addDays(today, 2)),
      startHour: 8,
      endHour: 10,
      status: "cancelled",
      userId: "admin-demo",
      createdAt: new Date().toISOString(),
    },
  ];

  return {
    users,
    invites: [
      { code: "JOIN2026", role: "employee", label: "Сотрудник" },
      { code: "ADMIN2026", role: "admin", label: "Администратор" },
    ],
    floors: [1, 2, 3, 4, 5, 6],
    seats: seedSeats(),
    bookings,
  };
}

function readDb(): MockDatabase {
  if (typeof window === "undefined") {
    return createSeedDatabase();
  }

  const raw = window.localStorage.getItem(DB_KEY);
  if (!raw) {
    const seeded = createSeedDatabase();
    writeDb(seeded);
    return seeded;
  }

  try {
    return JSON.parse(raw) as MockDatabase;
  } catch {
    const seeded = createSeedDatabase();
    writeDb(seeded);
    return seeded;
  }
}

function writeDb(db: MockDatabase) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("desker_token");
}

function getCurrentUserId() {
  const token = getToken();
  if (!token?.startsWith(TOKEN_PREFIX)) return null;
  return token.slice(TOKEN_PREFIX.length);
}

function requireCurrentUser(db: MockDatabase) {
  const userId = getCurrentUserId();
  const user = db.users.find((item) => item.id === userId);
  if (!user) {
    throw new Error("Сессия не найдена. Войдите снова.");
  }
  return user;
}

function deriveBookingStatus(booking: StoredBooking): Booking["status"] {
  if (booking.status !== "active") {
    return booking.status;
  }

  const now = new Date();
  const today = dateKey(now);

  if (booking.date < today) {
    return "completed";
  }

  if (booking.date === today && booking.endHour <= now.getHours()) {
    return "completed";
  }

  return "active";
}

function toBooking(booking: StoredBooking): Booking {
  return {
    id: booking.id,
    seatId: booking.seatId,
    floor: booking.floor,
    seatNumber: booking.seatNumber,
    zone: booking.zone,
    date: booking.date,
    startHour: booking.startHour,
    endHour: booking.endHour,
    status: deriveBookingStatus(booking),
  };
}

function seatStatusForDate(db: MockDatabase, seat: Seat, date: string, userId: string | null): Seat["status"] {
  if (seat.status === "unavailable") {
    return "unavailable";
  }

  const sameDateBookings = db.bookings.filter(
    (booking) =>
      booking.seatId === seat.id &&
      booking.date === date &&
      ["active", "completed"].includes(deriveBookingStatus(booking)),
  );

  const activeBookings = sameDateBookings.filter((booking) => deriveBookingStatus(booking) === "active");

  if (activeBookings.length === 0) {
    return "free";
  }

  if (userId && activeBookings.some((booking) => booking.userId === userId)) {
    return "mine";
  }

  return "occupied";
}

function buildSegments(hours: number[]) {
  const sorted = [...new Set(hours)].sort((a, b) => a - b);
  if (sorted.length === 0) return [] as Array<{ startHour: number; endHour: number }>;

  const segments: Array<{ startHour: number; endHour: number }> = [];
  let start = sorted[0];
  let previous = sorted[0];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    if (current === previous + 1) {
      previous = current;
      continue;
    }
    segments.push({ startHour: start, endHour: previous + 1 });
    start = current;
    previous = current;
  }

  segments.push({ startHour: start, endHour: previous + 1 });
  return segments;
}

function intersects(a: { startHour: number; endHour: number }, b: { startHour: number; endHour: number }) {
  return a.startHour < b.endHour && b.startHour < a.endHour;
}

function sortBookings(items: Booking[], sortBy?: string, sortOrder?: string) {
  const direction = sortOrder === "ASC" ? 1 : -1;
  const sorted = [...items].sort((left, right) => {
    const leftKey = `${left.date}-${String(left.startHour).padStart(2, "0")}`;
    const rightKey = `${right.date}-${String(right.startHour).padStart(2, "0")}`;
    if (sortBy === "booking_date") {
      return leftKey.localeCompare(rightKey) * direction;
    }
    return rightKey.localeCompare(leftKey) * -1;
  });
  return sorted;
}

export const mockApi = {
  async login(email: string, password: string) {
    await pause();
    const db = readDb();
    const user = db.users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || user.password !== password) {
      throw new Error("Неверные данные");
    }
    return {
      token: `${TOKEN_PREFIX}${user.id}`,
      user: normalizeUser(user),
    };
  },

  async register(payload: { email: string; firstName: string; lastName: string; password: string; inviteCode?: string }) {
    await pause();
    const db = readDb();
    const email = payload.email.trim().toLowerCase();

    if (db.users.some((item) => item.email.toLowerCase() === email)) {
      throw new Error("Пользователь уже зарегистрирован");
    }

    const invite = db.invites.find((item) => item.code === payload.inviteCode?.trim().toUpperCase());
    if (!invite) {
      throw new Error("Инвайт-код недействителен");
    }

    const user: StoredUser = {
      id: uid("user"),
      email,
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      role: invite.role,
      password: payload.password,
    };

    db.users.push(user);
    writeDb(db);

    return {
      token: `${TOKEN_PREFIX}${user.id}`,
      user: normalizeUser(user),
    };
  },

  async forgotPassword(email: string) {
    await pause();
    const db = readDb();
    const user = db.users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) {
      throw new Error("Пользователь с таким email не найден");
    }

    const code = "123456";
    user.resetCode = code;
    writeDb(db);
    return {
      message: `Код для демо-сценария: ${code}. Используйте его на втором шаге.`
    };
  },

  async resetPassword(payload: { email: string; code: string; newPassword: string }) {
    await pause();
    const db = readDb();
    const user = db.users.find((item) => item.email.toLowerCase() === payload.email.trim().toLowerCase());
    if (!user) {
      throw new Error("Пользователь с таким email не найден");
    }
    if (!user.resetCode || user.resetCode !== payload.code.trim()) {
      throw new Error("Неверный код восстановления");
    }

    user.password = payload.newPassword;
    delete user.resetCode;
    writeDb(db);
    return {
      message: "Пароль обновлён. Теперь можно войти с новым паролем.",
    };
  },

  async me() {
    await pause(120);
    const db = readDb();
    return normalizeUser(requireCurrentUser(db));
  },

  async updateMe(payload: { firstName?: string; lastName?: string; password?: string }) {
    await pause();
    const db = readDb();
    const user = requireCurrentUser(db);

    if (payload.firstName) user.firstName = payload.firstName.trim();
    if (payload.lastName) user.lastName = payload.lastName.trim();
    if (payload.password) user.password = payload.password;

    writeDb(db);
    return normalizeUser(user);
  },

  async floors() {
    await pause(100);
    return readDb().floors;
  },

  async equipmentTags() {
    await pause(100);
    const tags = new Set<string>();
    readDb().seats.forEach((seat) => {
      seat.tags.forEach((tag) => tags.add(tag));
    });
    return [...tags].sort();
  },

  async seats(params: { floor: number; date: string; tags?: string[]; status?: "all" | "free" | "occupied" }) {
    await pause(140);
    const db = readDb();
    const currentUser = getCurrentUserId();
    return db.seats
      .filter((seat) => seat.floor === params.floor)
      .map((seat) => ({
        ...seat,
        status: seatStatusForDate(db, seat, params.date, currentUser),
      }))
      .filter((seat) => !params.tags?.length || params.tags.every((tag) => seat.tags.includes(tag)))
      .filter((seat) => {
        if (params.status === "free") return seat.status === "free";
        if (params.status === "occupied") return ["occupied", "mine", "unavailable"].includes(seat.status);
        return true;
      });
  },

  async seatSlots(seatId: string, date: string) {
    await pause(120);
    const db = readDb();
    const currentUser = getCurrentUserId();
    const seat = db.seats.find((item) => item.id === seatId);
    if (!seat) {
      throw new Error("Место не найдено");
    }

    const bookings = db.bookings.filter((booking) => booking.seatId === seatId && booking.date === date && deriveBookingStatus(booking) === "active");

    const slots: HourSlot[] = [];
    for (let hour = OFFICE_START_HOUR; hour < OFFICE_END_HOUR; hour += 1) {
      if (seat.status === "unavailable") {
        slots.push({ hour, status: "occupied" });
        continue;
      }

      const booking = bookings.find((item) => hour >= item.startHour && hour < item.endHour);
      if (!booking) {
        slots.push({ hour, status: "free" });
        continue;
      }
      slots.push({
        hour,
        status: booking.userId === currentUser ? "mine" : "occupied",
      });
    }
    return slots;
  },

  async createBooking(payload: { seatId: string; date: string; hours: number[] }) {
    await pause(220);
    const db = readDb();
    const user = requireCurrentUser(db);
    const seat = db.seats.find((item) => item.id === payload.seatId);

    if (!seat) {
      throw new Error("Место не найдено");
    }
    if (seat.status === "unavailable") {
      throw new Error("Место недоступно");
    }

    const segments = buildSegments(payload.hours).filter(
      (segment) =>
        segment.startHour >= OFFICE_START_HOUR &&
        segment.endHour <= OFFICE_END_HOUR &&
        segment.startHour < segment.endHour,
    );

    if (segments.length === 0) {
      throw new Error("Выберите корректный временной интервал");
    }

    const activeSeatBookings = db.bookings.filter(
      (booking) => booking.seatId === seat.id && booking.date === payload.date && deriveBookingStatus(booking) === "active",
    );

    for (const segment of segments) {
      const hasConflict = activeSeatBookings.some((booking) =>
        intersects(segment, { startHour: booking.startHour, endHour: booking.endHour }),
      );
      if (hasConflict) {
        throw new Error("Место уже занято на выбранный интервал");
      }
    }

    const created = segments.map((segment) => {
      const booking: StoredBooking = {
        id: uid("booking"),
        seatId: seat.id,
        floor: seat.floor,
        seatNumber: seat.number,
        zone: seat.zone,
        date: payload.date,
        startHour: segment.startHour,
        endHour: segment.endHour,
        status: "active",
        userId: user.id,
        createdAt: new Date().toISOString(),
      };
      db.bookings.push(booking);
      return toBooking(booking);
    });

    writeDb(db);
    return { items: created };
  },

  async history(params: HistoryParams = {}) {
    await pause(140);
    const db = readDb();
    const user = requireCurrentUser(db);
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const filtered = db.bookings
      .filter((booking) => booking.userId === user.id)
      .map((booking) => toBooking(booking))
      .filter((booking) => !params.status || params.status === "all" || booking.status === params.status);

    const sorted = sortBookings(filtered, params.sortBy, params.sortOrder);
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize);

    return {
      items,
      total: filtered.length,
      page,
      pageSize,
    };
  },

  async cancelBooking(bookingId: string) {
    await pause(140);
    const db = readDb();
    const user = requireCurrentUser(db);
    const booking = db.bookings.find((item) => item.id === bookingId && item.userId === user.id);
    if (!booking) {
      throw new Error("Бронирование не найдено");
    }
    if (deriveBookingStatus(booking) !== "active") {
      throw new Error("Можно отменить только активную бронь");
    }
    booking.status = "cancelled";
    writeDb(db);
    return { status: "cancelled" };
  },

  async resetDemoData() {
    await pause(80);
    writeDb(createSeedDatabase());
  },
};
