import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

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
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["bookings-history"],
    queryFn: () =>
      api.history({
        page: 1,
        pageSize: 20,
        sortBy: "booking_date",
        sortOrder: "DESC",
      }),
  });

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => api.cancelBooking(bookingId),
    onSuccess: () => {
      toast.success("Бронирование отменено");
      void queryClient.invalidateQueries({ queryKey: ["bookings-history"] });
      void queryClient.invalidateQueries({ queryKey: ["seats"] });
    },
    onError: (mutationError: Error) => {
      toast.error(mutationError.message || "Не удалось отменить бронирование");
    },
  });

  const bookings = data?.items ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Назад
      </Button>
      <h1 className="mb-6 text-2xl font-bold">Предыдущие брони</h1>

      {isLoading && (
        <p className="text-muted-foreground">Загрузка истории...</p>
      )}
      {error && (
        <p className="text-destructive">
          {error instanceof Error
            ? error.message
            : "Не удалось загрузить историю"}
        </p>
      )}

      <div className="space-y-3">
        {bookings.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm"
          >
            <div>
              <p className="font-medium">
                Этаж {b.floor} · Место {b.seatNumber} · Зона {b.zone}
              </p>
              <p className="text-sm text-muted-foreground">
                {b.date} · {b.startHour}:00 – {b.endHour}:00
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor[b.status]}`}
              >
                {statusLabel[b.status]}
              </span>
              {b.status === "active" ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate(b.id)}
                >
                  Отменить
                </Button>
              ) : null}
            </div>
          </div>
        ))}
        {bookings.length === 0 && (
          <p className="text-center text-muted-foreground">
            У вас пока нет бронирований.
          </p>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
