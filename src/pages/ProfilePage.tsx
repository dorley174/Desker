import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingApi } from '@/api/bookingApi';
import { useAuth } from '@/features/auth/AuthProvider';
import type { Reservation, Resource } from '@/domain/types';

function pickActiveReservation(reservations: Reservation[]) {
  const now = Date.now();
  return reservations.find((r) => {
    if (r.status === 'CANCELLED' || r.status === 'COMPLETED' || r.status === 'NO_SHOW') return false;
    const s = new Date(r.startAt).getTime();
    const e = new Date(r.endAt).getTime();
    return s <= now && now < e;
  });
}

export function ProfilePage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [resourcesById, setResourcesById] = useState<Map<string, Resource>>(new Map());

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!user) return;
      setLoading(true);
      try {
        const [floors, reservations] = await Promise.all([
          bookingApi.listFloors(),
          bookingApi.listUserReservations(user.id),
        ]);
        const resources = (await Promise.all(floors.map((f) => bookingApi.listResources({ floorNumber: f })))).flat();
        const map = new Map<string, Resource>();
        for (const r of resources) map.set(r.id, r);

        if (!alive) return;
        setResourcesById(map);
        setMyReservations(reservations);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [user]);

  const active = useMemo(() => pickActiveReservation(myReservations), [myReservations]);
  const activeResource = active ? resourcesById.get(active.resourceId) : undefined;

  return (
    <div className="card" style={{ padding: 18 }}>
      <h1 style={{ margin: 0 }}>Профиль</h1>
      <p className="muted" style={{ marginTop: 6 }}>Учетная запись Desker</p>

      <hr />

      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 999,
            border: '1px solid var(--border)',
            background: '#e5e7eb',
            backgroundImage: user?.avatarUrl ? `url(${user.avatarUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div style={{ display: 'grid', gap: 4 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{user?.firstName} {user?.lastName}</div>
          <div className="muted">{user?.email}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="badge">{user?.role}</span>
            <span className="badge">{user?.status}</span>
          </div>
        </div>
      </div>

      <hr />

      <section style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Быстрые действия</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn" to="/settings">Настройки</Link>
          <Link className="btn" to="/history">История</Link>
        </div>
      </section>

      <hr />

      <section style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Активная бронь</h2>

        {loading ? (
          <p className="muted" style={{ margin: 0 }}>Загрузка…</p>
        ) : !active ? (
          <p className="muted" style={{ margin: 0 }}>Сейчас нет активной брони.</p>
        ) : (
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontWeight: 700 }}>
              {activeResource ? (
                <>Место {activeResource.code} — этаж {activeResource.floorNumber}, зона {activeResource.zoneName}</>
              ) : (
                <>Место id {active.resourceId}</>
              )}
            </div>
            <div className="muted" style={{ marginTop: 4 }}>
              {new Date(active.startAt).toLocaleString('ru-RU')} — {new Date(active.endAt).toLocaleString('ru-RU')}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="badge">{active.status}</span>
              <span className="badge">{active.source}</span>
            </div>

            {/*
              BACKEND INTEGRATION:
              - здесь будет check-in / no-show логика согласно policy.noShowCheckinWindowMin
              - и кнопки «Освободить место» / «Отменить бронь» для активных/будущих броней
            */}
          </div>
        )}
      </section>
    </div>
  );
}
