// Domain types inspired by the ERD in project.md.

export type UserRole = 'EMPLOYEE' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'BLOCKED';

export type ResourceType = 'DESK' | 'TEAM_ZONE' | 'MEETING_ROOM' | 'FOCUS_ROOM';
export type ResourceStatus = 'FREE' | 'OCCUPIED' | 'RESERVED' | 'UNAVAILABLE';

export type ReservationSource = 'MANUAL' | 'WALK_IN' | 'ADMIN' | 'RECURRING';
export type ReservationStatus =
  | 'CREATED'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export type FeatureCode =
  | 'PRINTER'
  | 'WHITEBOARD'
  | 'MONITOR_2PLUS'
  | 'TV_PANEL'
  | 'DOCK'
  | 'WINDOW_SIDE'
  | 'ACCESSIBLE';

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: UserRole;
  status: UserStatus;
};

export type OfficePolicy = {
  timezone: string; // e.g. "Europe/Moscow"
  workdayStart: string; // "HH:mm"
  workdayEnd: string; // "HH:mm"
  slotMinutes: number; // for this MVP we will use 60 (hourly slots)
  noShowCheckinWindowMin: number;
};

export type Resource = {
  id: string;
  code: string; // unique code, e.g. "4A-02"
  name: string;
  floorNumber: number;
  zoneId: string;
  zoneName: string;
  resourceType: ResourceType;
  capacity: number;
  status: ResourceStatus; // base status (effective status may depend on reservations)
  isActive: boolean;
  features: Partial<Record<FeatureCode, boolean>>;
  map: {
    x: number; // percentage 0..100
    y: number; // percentage 0..100
    w: number; // percentage 0..100
    h: number; // percentage 0..100
  };
};

export type Reservation = {
  id: string;
  resourceId: string;
  userId: string;
  startAt: string; // ISO
  endAt: string; // ISO
  source: ReservationSource;
  status: ReservationStatus;
};

export type FloorPlanZone = {
  id: string;
  name: string; // e.g. "A"
  floorNumber: number;
  map: { x: number; y: number; w: number; h: number };
};
