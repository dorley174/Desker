import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { bookingApi } from '@/api/bookingApi';
import { useAuth } from '@/features/auth/AuthProvider';
import type { Reservation, Resource } from '@/domain/types';

function formatDate(iso: string) {
  const d = new Date(iso);
  return format(d, 'd MMM yyyy', { locale: ru });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return format(d, 'HH:mm');
}

function statusLabel(status: Reservation['status']) {
  switch (status) {
    case 'CONFIRMED':
      return 'Забронировано';
    case 'CHECKED_IN':
      return 'Занято (check-in)';
    case 'CANCELLED':
      return 'Отменено';
    case 'COMPLETED':
      return 'Завершено';
    case 'NO_SHOW':
      return 'No-show';
    default:
      return status;
  }
}

export function HistoryPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [resourcesById, setResourcesById] = useState<Map<string, Resource>>(new Map());

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const [floors, myReservations] = await Promise.all([
          bookingApi.listFloors(),
          bookingApi.listUserReservations(user.id),
        ]);

        const resources = (
          await Promise.all(floors.map((f) => bookingApi.listResources({ floorNumber: f })))
        ).flat();

        const map = new Map<string, Resource>();
        for (const r of resources) map.set(r.id, r);

        if (!alive) return;
        setResourcesById(map);
        setReservations(myReservations);
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message ?? 'Не удалось загрузить историю');
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [user]);

  const rows = useMemo(() => {
    return [...reservations]
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
      .map((r) => {
        const resource = resourcesById.get(r.resourceId);
        return {
          reservation: r,
          resource,
          date: formatDate(r.startAt),
          time: `${formatTime(r.startAt)}–${formatTime(r.endAt)}`,
          status: statusLabel(r.status),
        };
      });
  }, [reservations, resourcesById]);

  if (loading) {
    return <div className="card" style={{ padding: 16 }}>Загрузка…</div>;
  }

  if (error) {
    return (
      <div className="card" style={{ padding: 16, borderColor: 'var(--danger)' }}>
        <span style={{ color: 'var(--danger)' }}>{error}</span>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 18 }}>
      <h1 style={{ margin: 0 }}>История</h1>
      <p className="muted" style={{ marginTop: 6 }}>
        Предыдущие брони
      </p>

      <hr />

      {rows.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>Пока нет бронирований.</p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map(({ reservation, resource, date, time, status }) => (
            <div key={reservation.id} className="card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{ fontWeight: 700 }}>
                    {resource ? (
                      <>Место {resource.code} — этаж {resource.floorNumber}, зона {resource.zoneName}</>
                    ) : (
                      <>Место (удалено) — id {reservation.resourceId}</>
                    )}
                  </div>
                  <div className="muted">{date} • {time}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge">{status}</span>
                  <span className="badge">{reservation.source}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
