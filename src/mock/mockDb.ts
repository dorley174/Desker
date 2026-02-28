import type { OfficePolicy, Reservation, Resource, User, UserRole } from '@/domain/types';

type InviteCodeRecord = {
  code: string;
  targetRole: UserRole;
  expiresAt?: string;
  maxUses: number;
  usedCount: number;
  status: 'ACTIVE' | 'DISABLED' | 'EXPIRED';
};

type UserRecord = User & { password: string };

export type MockDb = {
  policy: OfficePolicy;
  inviteCodes: InviteCodeRecord[];
  users: UserRecord[];
  resources: Resource[];
  reservations: Reservation[];
};

const STORAGE_KEY = 'desker_mock_db_v1';

function uuid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now());
}

function seedResourcesForFloor(floorNumber: number): Resource[] {
  const zones = [
    { id: `z${floorNumber}A`, name: 'A', x: 6, y: 10, w: 56, h: 34 },
    { id: `z${floorNumber}D`, name: 'D', x: 10, y: 52, w: 38, h: 38 },
    { id: `z${floorNumber}B`, name: 'B', x: 74, y: 10, w: 22, h: 48 },
    { id: `z${floorNumber}C`, name: 'C', x: 58, y: 68, w: 38, h: 22 }
  ];

  const resources: Resource[] = [];

  function addDesk(
    zone: (typeof zones)[number],
    n: number,
    relX: number,
    relY: number,
    relW: number,
    relH: number
  ) {
    const x = zone.x + (zone.w * relX) / 100;
    const y = zone.y + (zone.h * relY) / 100;
    const w = (zone.w * relW) / 100;
    const h = (zone.h * relH) / 100;

    const code = `${floorNumber}${zone.name}-${String(n).padStart(2, '0')}`;

    const featuresByNumber: Record<number, Resource['features']> = {
      1: { PRINTER: true, WINDOW_SIDE: true },
      2: { MONITOR_2PLUS: true, DOCK: true },
      3: { TV_PANEL: true },
      4: { WHITEBOARD: true },
      5: { MONITOR_2PLUS: true },
      6: { ACCESSIBLE: true }
    };

    resources.push({
      id: uuid(),
      code,
      name: `Desk ${code}`,
      floorNumber,
      zoneId: zone.id,
      zoneName: zone.name,
      resourceType: 'DESK',
      capacity: 1,
      status: 'FREE',
      isActive: true,
      features: featuresByNumber[n] ?? {},
      map: { x, y, w, h },
    });
  }

  // Layouts inspired by sketches (3x2, 2x3 etc.)
  for (const zone of zones) {
    if (zone.name === 'A' || zone.name === 'C') {
      // 3 columns x 2 rows
      const cells = [
        { n: 1, x: 8, y: 14 },
        { n: 2, x: 42, y: 14 },
        { n: 3, x: 76, y: 14 },
        { n: 4, x: 8, y: 62 },
        { n: 5, x: 42, y: 62 },
        { n: 6, x: 76, y: 62 }
      ];
      for (const c of cells) addDesk(zone, c.n, c.x, c.y, 14, 26);
    } else if (zone.name === 'B') {
      // 2 columns x 3 rows
      const cells = [
        { n: 1, x: 18, y: 12 },
        { n: 2, x: 60, y: 12 },
        { n: 3, x: 18, y: 42 },
        { n: 4, x: 60, y: 42 },
        { n: 5, x: 18, y: 72 },
        { n: 6, x: 60, y: 72 }
      ];
      for (const c of cells) addDesk(zone, c.n, c.x, c.y, 22, 18);
    } else {
      // D: 2 columns x 3 rows
      const cells = [
        { n: 1, x: 16, y: 14 },
        { n: 2, x: 60, y: 14 },
        { n: 3, x: 16, y: 42 },
        { n: 4, x: 60, y: 42 },
        { n: 5, x: 16, y: 72 },
        { n: 6, x: 60, y: 72 }
      ];
      for (const c of cells) addDesk(zone, c.n, c.x, c.y, 20, 18);
    }
  }

  return resources;
}

function seedDb(): MockDb {
  const policy: OfficePolicy = {
    timezone: 'Europe/Moscow',
    workdayStart: '10:00',
    workdayEnd: '18:00',
    slotMinutes: 60,
    noShowCheckinWindowMin: 15,
  };

  const inviteCodes: InviteCodeRecord[] = [
    { code: 'EMPLOYEE-2026', targetRole: 'EMPLOYEE', maxUses: 999, usedCount: 0, status: 'ACTIVE' },
    { code: 'ADMIN-2026', targetRole: 'ADMIN', maxUses: 50, usedCount: 0, status: 'ACTIVE' }
  ];

  const users: UserRecord[] = [
    {
      id: 'u_demo',
      email: 'demo@desker.local',
      password: 'demo1234',
      firstName: 'Иван',
      lastName: 'Иванов',
      avatarUrl: undefined,
      role: 'EMPLOYEE',
      status: 'ACTIVE',
    },
  ];

  const resources: Resource[] = [];
  for (const floor of [1, 2, 3, 4, 5, 6]) resources.push(...seedResourcesForFloor(floor));

  // A few seeded reservations to make UI non-empty.
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  const resA1 = resources.find((r) => r.code === '4A-01');
  const resA2 = resources.find((r) => r.code === '4A-02');
  const resD2 = resources.find((r) => r.code === '4D-02');

  const reservations: Reservation[] = [];

  if (resA1) {
    reservations.push({
      id: uuid(),
      resourceId: resA1.id,
      userId: 'u_someone_else',
      // NOTE: mock data uses "local" ISO without timezone offset.
      // BACKEND INTEGRATION: in the real system all times must be interpreted in office timezone.
      startAt: `${dateStr}T10:00:00`,
      endAt: `${dateStr}T12:00:00`,
      source: 'MANUAL',
      status: 'CONFIRMED',
    });
  }

  if (resA2) {
    reservations.push({
      id: uuid(),
      resourceId: resA2.id,
      userId: 'u_demo',
      startAt: `${dateStr}T11:00:00`,
      endAt: `${dateStr}T14:00:00`,
      source: 'MANUAL',
      status: 'CONFIRMED',
    });
  }

  if (resD2) {
    reservations.push({
      id: uuid(),
      resourceId: resD2.id,
      userId: 'u_someone_else',
      startAt: `${dateStr}T12:00:00`,
      endAt: `${dateStr}T18:00:00`,
      source: 'WALK_IN',
      status: 'CHECKED_IN',
    });
  }

  // Mark one place as unavailable (maintenance)
  const unavailable = resources.find((r) => r.code === '3B-03');
  if (unavailable) unavailable.status = 'UNAVAILABLE';

  return { policy, inviteCodes, users, resources, reservations };
}

export function loadMockDb(): MockDb {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as MockDb;
    } catch {
      // fall through to seed
    }
  }
  const seeded = seedDb();
  saveMockDb(seeded);
  return seeded;
}

export function saveMockDb(db: MockDb) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function updateMockDb(updater: (db: MockDb) => MockDb): MockDb {
  const db = loadMockDb();
  const next = updater(db);
  saveMockDb(next);
  return next;
}

export function selectPublicUser(u: UserRecord): User {
  // Don’t leak password to the app layer.
  // (In real backend you’ll have proper auth anyway.)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...publicUser } = u;
  return publicUser;
}
