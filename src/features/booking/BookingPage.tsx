import { useEffect, useMemo, useState } from 'react';
import { bookingApi } from '@/api/bookingApi';
import type { OfficePolicy, Reservation, Resource, ResourceStatus, FeatureCode } from '@/domain/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { useToast } from '@/components/ui/toast/ToastProvider';
import styles from './BookingPage.module.css';
import { buildSlots, effectiveStatusForInterval, overlaps, toDateKey } from './bookingUtils';

const ZONES_LAYOUT = [
  { name: 'A', x: 6, y: 10, w: 56, h: 34 },
  { name: 'D', x: 10, y: 52, w: 38, h: 38 },
  { name: 'B', x: 74, y: 10, w: 22, h: 48 },
  { name: 'C', x: 58, y: 68, w: 38, h: 22 },
] as const;

const CORRIDORS = [
  { x: 52, y: 40, w: 20, h: 40 },
  { x: 46, y: 20, w: 26, h: 18 },
] as const;

type StatusFilterState = Record<ResourceStatus, boolean>;

type FeatureFilterState = Record<FeatureCode, boolean>;

function deskNumber(code: string) {
  const last = code.split('-')[1];
  if (!last) return code;
  const n = Number(last);
  return Number.isFinite(n) ? String(n) : last;
}

function featureLabel(code: FeatureCode) {
  switch (code) {
    case 'PRINTER':
      return 'Принтер';
    case 'WHITEBOARD':
      return 'Доска';
    case 'MONITOR_2PLUS':
      return '2+ Мониторов';
    case 'TV_PANEL':
      return 'ТВ‑панель';
    case 'DOCK':
      return 'Док‑станция';
    case 'WINDOW_SIDE':
      return 'У окна';
    case 'ACCESSIBLE':
      return 'Доступность';
    default:
      return code;
  }
}

function statusLabel(s: ResourceStatus) {
  switch (s) {
    case 'FREE':
      return 'Свободно';
    case 'RESERVED':
      return 'Забронировано';
    case 'OCCUPIED':
      return 'Занято';
    case 'UNAVAILABLE':
      return 'Недоступно';
    default:
      return s;
  }
}

function isBlockingReservation(r: Reservation) {
  return r.status !== 'CANCELLED' && r.status !== 'COMPLETED' && r.status !== 'NO_SHOW';
}

export function BookingPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [policy, setPolicy] = useState<OfficePolicy | null>(null);
  const [floors, setFloors] = useState<number[]>([]);

  const [selectedFloor, setSelectedFloor] = useState<number>(4);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  const [resources, setResources] = useState<Resource[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const [loading, setLoading] = useState(true);

  const [viewSlotIndex, setViewSlotIndex] = useState(0);

  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilterState>({
    FREE: true,
    RESERVED: false,
    OCCUPIED: false,
    UNAVAILABLE: false,
  });

  const [featureFilter, setFeatureFilter] = useState<FeatureFilterState>({
    PRINTER: false,
    WHITEBOARD: false,
    MONITOR_2PLUS: false,
    TV_PANEL: false,
    DOCK: false,
    WINDOW_SIDE: false,
    ACCESSIBLE: false,
  });

  const dateKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);

  const slots = useMemo(() => {
    if (!policy) return [];
    return buildSlots(dateKey, policy.workdayStart, policy.workdayEnd, policy.slotMinutes);
  }, [policy, dateKey]);

  // Keep viewSlotIndex valid when policy/date changes.
  useEffect(() => {
    if (slots.length === 0) return;

    // Default to the nearest slot to "now" when date is today.
    const todayKey = toDateKey(new Date());
    if (dateKey === todayKey) {
      const now = new Date();
      const nowTs = now.getTime();
      const idx = slots.findIndex((s) => {
        const st = new Date(s.startAt).getTime();
        const en = new Date(s.endAt).getTime();
        return st <= nowTs && nowTs < en;
      });
      if (idx >= 0) {
        setViewSlotIndex(idx);
        return;
      }
    }

    setViewSlotIndex((prev) => Math.min(prev, slots.length - 1));
  }, [slots.length, dateKey]);

  const viewInterval = useMemo(() => {
    if (slots.length === 0) return null;
    const s = slots[Math.min(viewSlotIndex, slots.length - 1)]!;
    return { startAt: s.startAt, endAt: s.endAt };
  }, [slots, viewSlotIndex]);

  useEffect(() => {
    let alive = true;

    async function init() {
      setLoading(true);
      try {
        const [p, f] = await Promise.all([bookingApi.getPolicy(), bookingApi.listFloors()]);
        if (!alive) return;
        setPolicy(p);
        setFloors(f);
      } finally {
        if (alive) setLoading(false);
      }
    }

    init();
    return () => {
      alive = false;
    };
  }, []);

  async function reloadFloorData(floorNumber: number, date: string) {
    // BACKEND INTEGRATION: in the real system requests should include office timezone & policy.
    const [r, res] = await Promise.all([
      bookingApi.listResources({ floorNumber }),
      bookingApi.listReservations({ date, floorNumber }),
    ]);
    setResources(r);
    setReservations(res);
  }

  useEffect(() => {
    if (!policy) return;
    let alive = true;

    async function loadFloor() {
      setLoading(true);
      try {
        await reloadFloorData(selectedFloor, dateKey);
        if (!alive) return;
      } catch (err: any) {
        toast.push(err?.message ?? 'Не удалось загрузить данные этажа', 'error');
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadFloor();
    return () => {
      alive = false;
    };
  }, [selectedFloor, dateKey, policy]);

  const reservationsByResourceId = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const r of reservations) {
      const arr = map.get(r.resourceId) ?? [];
      arr.push(r);
      map.set(r.resourceId, arr);
    }
    return map;
  }, [reservations]);

  const resourcesWithStatus = useMemo(() => {
    return resources.map((r) => {
      const rs = reservationsByResourceId.get(r.id) ?? [];
      const eff = effectiveStatusForInterval(r.status, rs, viewInterval);
      return { resource: r, status: eff };
    });
  }, [resources, reservationsByResourceId, viewInterval]);

  const filteredResources = useMemo(() => {
    const activeFeatureCodes = (Object.keys(featureFilter) as FeatureCode[]).filter((k) => featureFilter[k]);

    return resourcesWithStatus.filter(({ resource, status }) => {
      if (!statusFilter[status]) return false;

      if (activeFeatureCodes.length > 0) {
        for (const code of activeFeatureCodes) {
          if (!resource.features?.[code]) return false;
        }
      }

      return true;
    });
  }, [resourcesWithStatus, statusFilter, featureFilter]);

  const resourcesById = useMemo(() => {
    const map = new Map<string, { resource: Resource; status: ResourceStatus }>();
    for (const item of resourcesWithStatus) map.set(item.resource.id, item);
    return map;
  }, [resourcesWithStatus]);

  const filteredResourceIds = useMemo(() => new Set(filteredResources.map((x) => x.resource.id)), [filteredResources]);

  const selectedResourceStatus = selectedResource ? resourcesById.get(selectedResource.id)?.status : undefined;

  function resetFilters() {
    setStatusFilter({ FREE: true, RESERVED: false, OCCUPIED: false, UNAVAILABLE: false });
    setFeatureFilter({
      PRINTER: false,
      WHITEBOARD: false,
      MONITOR_2PLUS: false,
      TV_PANEL: false,
      DOCK: false,
      WINDOW_SIDE: false,
      ACCESSIBLE: false,
    });
  }

  function autoPick() {
    const pick = filteredResources.find((x) => x.status === 'FREE');
    if (!pick) {
      toast.push('Нет подходящих свободных мест для автоподбора', 'error');
      return;
    }
    setSelectedResource(pick.resource);
    toast.push(`Рекомендуем место ${pick.resource.code}`, 'success');
  }

  if (!user) {
    return null; // guarded by HomePage
  }

  if (loading && !policy) {
    return <div className="card" style={{ padding: 16 }}>Загрузка…</div>;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.topBar}>
        <div>
          <h1 style={{ margin: 0 }}>Бронирование</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Выберите этаж, примените фильтры и забронируйте место на почасовые слоты.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="muted" style={{ fontSize: 12 }}>Дата</span>
            <input
              className="input"
              type="date"
              value={dateKey}
              onChange={(e) => setSelectedDate(new Date(`${e.target.value}T00:00:00`))}
              style={{ width: 170 }}
            />
          </label>

          <button className="btn" onClick={resetFilters}>Сбросить фильтры</button>
          <button className="btn primary" onClick={autoPick}>Автоподбор</button>
        </div>
      </div>

      <div className={`${styles.grid} ${selectedResource ? styles.withSidebar : ''}`}>
        {/* Floors */}
        <div className={`card ${styles.panel}`}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Этаж</div>
          <div className={styles.floorList}>
            {floors.map((f) => (
              <button
                key={f}
                className={`${styles.floorBtn} ${f === selectedFloor ? styles.active : ''}`}
                onClick={() => {
                  setSelectedFloor(f);
                  setSelectedResource(null);
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className={`card ${styles.panel}`}>
          <div className={styles.filters}>
            <div className={styles.filterBlock}>
              <div style={{ fontWeight: 800 }}>Статус</div>

              {(Object.keys(statusFilter) as ResourceStatus[]).map((s) => (
                <label key={s} className="row" style={{ justifyContent: 'space-between' }}>
                  <span>{statusLabel(s)}</span>
                  <input
                    type="checkbox"
                    checked={statusFilter[s]}
                    onChange={(e) => setStatusFilter((prev) => ({ ...prev, [s]: e.target.checked }))}
                  />
                </label>
              ))}

              <div className="muted" style={{ fontSize: 12 }}>
                Статусы учитывают выбранный слот «на карте».
              </div>
            </div>

            <div className={styles.filterBlock}>
              <div style={{ fontWeight: 800 }}>Теги</div>

              {(Object.keys(featureFilter) as FeatureCode[]).map((k) => (
                <label key={k} className="row" style={{ justifyContent: 'space-between' }}>
                  <span>{featureLabel(k)}</span>
                  <input
                    type="checkbox"
                    checked={featureFilter[k]}
                    onChange={(e) => setFeatureFilter((prev) => ({ ...prev, [k]: e.target.checked }))}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className={`card ${styles.mapShell}`}>
          <div className={styles.mapTop}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 800 }}>Карта</div>
              {policy && slots.length > 0 && (
                <label className="row" style={{ gap: 8 }}>
                  <span className="muted">Слот на карте:</span>
                  <select
                    className="input"
                    value={String(viewSlotIndex)}
                    onChange={(e) => setViewSlotIndex(Number(e.target.value))}
                    style={{ width: 120 }}
                  >
                    {slots.map((s, idx) => (
                      <option key={s.startAt} value={idx}>{s.label}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {selectedResource ? (
              <button className="btn" onClick={() => setSelectedResource(null)}>
                Снять выбор
              </button>
            ) : (
              <span className="muted" style={{ fontSize: 12 }}>
                Нажмите на место на карте, чтобы открыть бронирование.
              </span>
            )}
          </div>

          <div className={styles.map}>
            {ZONES_LAYOUT.map((z) => (
              <div
                key={z.name}
                className={styles.zone}
                style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.w}%`, height: `${z.h}%` }}
                aria-label={`Zone ${z.name}`}
              >
                <div className={styles.zoneLabel} aria-hidden>{z.name}</div>
              </div>
            ))}

            {CORRIDORS.map((c, idx) => (
              <div
                key={idx}
                className={styles.corridor}
                style={{ left: `${c.x}%`, top: `${c.y}%`, width: `${c.w}%`, height: `${c.h}%` }}
                aria-hidden
              />
            ))}

            {resourcesWithStatus.map(({ resource, status }) => {
              const isVisible = filteredResourceIds.has(resource.id);
              if (!isVisible) return null;

              const isSelected = selectedResource?.id === resource.id;
              const className = [
                styles.desk,
                status === 'FREE' ? styles.free : '',
                status === 'RESERVED' ? styles.reserved : '',
                status === 'OCCUPIED' ? styles.occupied : '',
                status === 'UNAVAILABLE' ? styles.unavailable : '',
                isSelected ? styles.selected : '',
              ].filter(Boolean).join(' ');

              return (
                <button
                  key={resource.id}
                  className={className}
                  style={{
                    left: `${resource.map.x}%`,
                    top: `${resource.map.y}%`,
                    width: `${resource.map.w}%`,
                    height: `${resource.map.h}%`,
                  }}
                  onClick={() => {
                    setSelectedResource(resource);
                  }}
                  title={`${resource.code} • ${statusLabel(status)}`}
                >
                  {deskNumber(resource.code)}
                </button>
              );
            })}

            {filteredResources.length === 0 && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 24,
                  textAlign: 'center',
                  color: 'var(--muted)',
                }}
              >
                Нет доступных мест по выбранным фильтрам и слоту.
              </div>
            )}
          </div>

          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={styles.swatch} style={{ background: '#fff', borderColor: '#111827' }} /> Свободно
            </span>
            <span className={styles.legendItem}>
              <span className={styles.swatch} style={{ background: 'rgba(124,58,237,0.25)', borderColor: 'rgba(124,58,237,0.9)' }} /> Забронировано
            </span>
            <span className={styles.legendItem}>
              <span className={styles.swatch} style={{ background: 'rgba(220,38,38,0.2)', borderColor: 'rgba(220,38,38,0.9)' }} /> Занято
            </span>
            <span className={styles.legendItem}>
              <span className={styles.swatch} style={{ background: 'rgba(156,163,175,0.2)', borderColor: 'rgba(156,163,175,0.9)' }} /> Недоступно
            </span>
          </div>
        </div>

        {/* Sidebar (booking) */}
        {selectedResource && policy && viewInterval && (
          <BookingSidebar
            key={selectedResource.id}
            userId={user.id}
            policy={policy}
            dateKey={dateKey}
            resource={selectedResource}
            resourceStatus={selectedResourceStatus ?? 'FREE'}
            slots={slots}
            defaultSlotIndex={viewSlotIndex}
            reservations={reservationsByResourceId.get(selectedResource.id) ?? []}
            onClose={() => setSelectedResource(null)}
            onChanged={async () => {
              await reloadFloorData(selectedFloor, dateKey);
            }}
          />
        )}
      </div>
    </div>
  );
}

function BookingSidebar(props: {
  userId: string;
  policy: OfficePolicy;
  dateKey: string;
  resource: Resource;
  resourceStatus: ResourceStatus;
  slots: { startAt: string; endAt: string; label: string }[];
  defaultSlotIndex: number;
  reservations: Reservation[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const toast = useToast();

  const [startIdx, setStartIdx] = useState(props.defaultSlotIndex);
  const [endIdx, setEndIdx] = useState(props.defaultSlotIndex);
  const [submitting, setSubmitting] = useState(false);

  const selectedInterval = useMemo(() => {
    const s = props.slots[startIdx];
    const e = props.slots[endIdx];
    if (!s || !e) return null;
    return { startAt: s.startAt, endAt: e.endAt };
  }, [props.slots, startIdx, endIdx]);

  const selectedLabel = useMemo(() => {
    const s = props.slots[startIdx];
    const e = props.slots[endIdx];
    if (!s || !e) return '';
    const end = new Date(e.endAt);
    const endHm = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
    return `${s.label}–${endHm}`;
  }, [props.slots, startIdx, endIdx]);

  const slotStateByIdx = useMemo(() => {
    type SlotState = 'free' | 'busyOther' | 'busyMe' | 'unavailable';
    const map = new Map<number, SlotState>();

    props.slots.forEach((slot, idx) => {
      if (props.resourceStatus === 'UNAVAILABLE') {
        map.set(idx, 'unavailable');
        return;
      }

      let state: SlotState = 'free';

      for (const r of props.reservations) {
        if (!isBlockingReservation(r)) continue;
        if (!overlaps(slot.startAt, slot.endAt, r.startAt, r.endAt)) continue;

        if (r.userId === props.userId) {
          // Keep "busyMe" unless there is also "busyOther" (should not happen in a consistent backend).
          state = state === 'busyOther' ? state : 'busyMe';
        } else {
          state = 'busyOther';
          break;
        }
      }

      map.set(idx, state);
    });

    return map;
  }, [props.slots, props.reservations, props.resourceStatus, props.userId]);

  const rangeHasConflict = useMemo(() => {
    if (!selectedInterval) return true;

    // Any blocking reservation overlapping selected interval.
    const conflict = props.reservations.find(
      (r) => isBlockingReservation(r) && overlaps(selectedInterval.startAt, selectedInterval.endAt, r.startAt, r.endAt)
    );
    if (!conflict) return null;
    return conflict;
  }, [props.reservations, selectedInterval]);

  const myConflict = useMemo(() => {
    if (!rangeHasConflict) return null;
    return rangeHasConflict.userId === props.userId ? rangeHasConflict : null;
  }, [rangeHasConflict, props.userId]);

  const someoneElseConflict = useMemo(() => {
    if (!rangeHasConflict) return null;
    return rangeHasConflict.userId !== props.userId ? rangeHasConflict : null;
  }, [rangeHasConflict, props.userId]);

  const nowTs = Date.now();

  const myReservationState = useMemo(() => {
    if (!myConflict) return null;

    const s = new Date(myConflict.startAt).getTime();
    const e = new Date(myConflict.endAt).getTime();

    const isFuture = nowTs < s;
    const isActive = s <= nowTs && nowTs < e;

    return { isFuture, isActive };
  }, [myConflict, nowTs]);

  const canCheckIn = useMemo(() => {
    if (!myConflict) return false;
    if (myConflict.status !== 'CONFIRMED') return false;

    const s = new Date(myConflict.startAt).getTime();
    const windowMs = props.policy.noShowCheckinWindowMin * 60_000;
    return s <= nowTs && nowTs < s + windowMs;
  }, [myConflict, props.policy.noShowCheckinWindowMin, nowTs]);

  function safeSetRange(nextStart: number, nextEnd: number) {
    const s = Math.min(nextStart, nextEnd);
    const e = Math.max(nextStart, nextEnd);

    // Ensure all slots in range are free (not blocked).
    for (let i = s; i <= e; i++) {
      const state = slotStateByIdx.get(i);
      if (state === 'busyOther' || state === 'unavailable') {
        toast.push('Этот интервал пересекается с занятостью. Выберите непрерывный свободный диапазон.', 'error');
        return;
      }
    }

    setStartIdx(s);
    setEndIdx(e);
  }

  async function onReserve(source: 'MANUAL' | 'WALK_IN') {
    if (!selectedInterval) return;

    const sTs = new Date(selectedInterval.startAt).getTime();
    const eTs = new Date(selectedInterval.endAt).getTime();
    if (eTs <= nowTs) {
      toast.push('Нельзя бронировать в прошлом времени', 'error');
      return;
    }
    if (source === 'MANUAL' && sTs < nowTs) {
      toast.push('Для ручной брони выберите слот начиная с текущего времени', 'error');
      return;
    }
    if (source === 'WALK_IN' && !(sTs <= nowTs && nowTs < eTs)) {
      toast.push('Walk‑in можно занять только на текущий часовой слот', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await bookingApi.createReservation({
        resourceId: props.resource.id,
        userId: props.userId,
        startAt: selectedInterval.startAt,
        endAt: selectedInterval.endAt,
        source,
      });
      await props.onChanged();
      toast.push('Бронь создана', 'success');
    } catch (err: any) {
      toast.push(err?.message ?? 'Не удалось создать бронь', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function onCancelMine() {
    if (!myConflict) return;
    setSubmitting(true);
    try {
      await bookingApi.cancelReservation(myConflict.id, props.userId);
      await props.onChanged();
      toast.push('Бронь отменена', 'success');
    } catch (err: any) {
      toast.push(err?.message ?? 'Не удалось отменить бронь', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function onCompleteMine() {
    if (!myConflict) return;
    setSubmitting(true);
    try {
      await bookingApi.completeReservation(myConflict.id, props.userId);
      await props.onChanged();
      toast.push('Место освобождено', 'success');
    } catch (err: any) {
      toast.push(err?.message ?? 'Не удалось освободить место', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function onCheckIn() {
    if (!myConflict) return;
    setSubmitting(true);
    try {
      await bookingApi.checkIn(myConflict.id, props.userId);
      await props.onChanged();
      toast.push('Check‑in подтверждён', 'success');
    } catch (err: any) {
      toast.push(err?.message ?? 'Не удалось подтвердить присутствие', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const featureBadges = useMemo(() => {
    const on = Object.entries(props.resource.features ?? {}).filter(([, v]) => v);
    return on.map(([k]) => k as FeatureCode);
  }, [props.resource.features]);

  const isToday = props.dateKey === toDateKey(new Date());
  const canWalkIn = useMemo(() => {
    if (!isToday || !selectedInterval) return false;
    const s = new Date(selectedInterval.startAt).getTime();
    const e = new Date(selectedInterval.endAt).getTime();
    return s <= nowTs && nowTs < e;
  }, [isToday, selectedInterval, nowTs]);

  return (
    <aside className={`card ${styles.sidebar}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div className="muted" style={{ fontSize: 12 }}>Забронировать</div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>{props.resource.code}</div>
          <div className="muted" style={{ marginTop: 4 }}>
            Этаж {props.resource.floorNumber}, зона {props.resource.zoneName}
          </div>
        </div>
        <button className="btn" onClick={props.onClose} aria-label="Закрыть">
          ✕
        </button>
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span className="badge">{statusLabel(props.resourceStatus)}</span>
        {featureBadges.slice(0, 4).map((b) => (
          <span key={b} className="badge">{featureLabel(b)}</span>
        ))}
      </div>

      <hr />

      <div style={{ fontWeight: 800 }}>Слоты (по часу)</div>
      <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
        Выберите непрерывный диапазон свободных слотов.
      </div>

      <div className={styles.slotList}>
        {props.slots.map((s, idx) => {
          const state = slotStateByIdx.get(idx) ?? 'free';
          const blocked = state === 'busyOther' || state === 'unavailable';
          const selected = startIdx <= idx && idx <= endIdx;
          return (
            <button
              key={s.startAt}
              className={`${styles.slotBtn} ${selected ? styles.slotSelected : ''} ${blocked ? styles.slotBlocked : ''}`}
              onClick={() => {
                if (blocked) return;

                if (startIdx === endIdx) {
                  // 1) if single-slot selection -> extend to clicked slot
                  safeSetRange(startIdx, idx);
                  return;
                }

                // 2) if range already selected
                if (idx < startIdx) {
                  safeSetRange(idx, endIdx);
                } else if (idx > endIdx) {
                  safeSetRange(startIdx, idx);
                } else {
                  // 3) click inside range -> collapse to a single slot
                  safeSetRange(idx, idx);
                }
              }}
              disabled={blocked}
            >
              <span>{s.label}</span>
              <span className="muted" style={{ fontSize: 12 }}>
                {state === 'busyOther' ? 'занято' : state === 'busyMe' ? 'моя бронь' : state === 'unavailable' ? 'недоступно' : ''}
              </span>
            </button>
          );
        })}
      </div>

      <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
        Выбрано: <b>{selectedLabel}</b>
      </div>

      <hr />

      {someoneElseConflict && (
        <div className="card" style={{ padding: 12, borderColor: 'var(--danger)' }}>
          <div style={{ color: 'var(--danger)', fontWeight: 800 }}>Место уже занято на выбранный интервал</div>
          <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
            Выберите другое время или другое место.
          </div>
        </div>
      )}

      {myConflict && (
        <div className="card" style={{ padding: 12, borderColor: 'var(--ok)' }}>
          <div style={{ color: 'var(--ok)', fontWeight: 800 }}>Это ваша бронь</div>
          <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
            Статус: {myConflict.status}
          </div>
          {canCheckIn && (
            <button className="btn primary" style={{ marginTop: 10, width: '100%' }} onClick={onCheckIn} disabled={submitting}>
              Я на месте (check‑in)
            </button>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            {myReservationState?.isFuture && (
              <button className="btn" style={{ flex: 1 }} onClick={onCancelMine} disabled={submitting}>
                Отменить
              </button>
            )}
            {myReservationState?.isActive && (
              <button className="btn danger" style={{ flex: 1 }} onClick={onCompleteMine} disabled={submitting}>
                Освободить
              </button>
            )}
          </div>
        </div>
      )}

      {!rangeHasConflict && props.resourceStatus !== 'UNAVAILABLE' && (
        <>
          <div className={styles.actionRow}>
            <button className="btn" onClick={props.onClose} disabled={submitting}>
              ✕
            </button>
            <button
              className="btn primary"
              onClick={() => onReserve('MANUAL')}
              disabled={submitting}
            >
              ✓
            </button>
          </div>

          <div style={{ marginTop: 10 }}>
            <button
              className="btn"
              style={{ width: '100%' }}
              onClick={() => onReserve('WALK_IN')}
              disabled={submitting || !canWalkIn}
              title={canWalkIn ? 'Занять место сейчас (walk-in)' : 'Walk-in доступен только для текущего слотa сегодня'}
            >
              Занять сейчас (walk‑in)
            </button>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Автоосвобождение (no‑show) на стороне бэкенда: если не сделать check‑in в течение {props.policy.noShowCheckinWindowMin} минут от начала — бронь будет отменена.
            </div>
          </div>
        </>
      )}

      {props.resourceStatus === 'UNAVAILABLE' && (
        <div className="card" style={{ padding: 12, borderColor: 'var(--disabled)' }}>
          <div style={{ fontWeight: 800, color: 'var(--muted)' }}>Место недоступно</div>
          <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
            Обычно это ремонт/блокировка. В бэкенде будет причина и период.
          </div>
        </div>
      )}
    </aside>
  );
}
