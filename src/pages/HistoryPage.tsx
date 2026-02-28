import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MOCK_BOOKINGS } from "@/data/mockData";
import { ArrowLeft } from "lucide-react";

const statusLabel: Record<string, string> = {
  completed: "Завершена",
  cancelled: "Отменена",
  "no-show": "Неявка",
  active: "Активна",
};

const statusColor: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-700",
  "no-show": "bg-yellow-100 text-yellow-800",
  active: "bg-blue-100 text-blue-800",
};

const HistoryPage = () => {
  const navigate = useNavigate();
  // TODO: replace with API call
  const bookings = MOCK_BOOKINGS;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Назад
      </Button>
      <h1 className="mb-6 text-2xl font-bold">Предыдущие брони</h1>

      <div className="space-y-3">
        {bookings.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm">
            <div>
              <p className="font-medium">Этаж {b.floor} · Место {b.seatNumber} · Зона {b.zone}</p>
              <p className="text-sm text-muted-foreground">{b.date} · {b.startHour}:00 – {b.endHour}:00</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor[b.status]}`}>
              {statusLabel[b.status]}
            </span>
          </div>
        ))}
        {bookings.length === 0 && (
          <p className="text-center text-muted-foreground">У вас пока нет бронирований.</p>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
