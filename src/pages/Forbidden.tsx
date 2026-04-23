import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

const Forbidden = () => (
  <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
    <div className="rounded-full bg-amber-100 p-4 text-amber-700">
      <ShieldAlert className="h-10 w-10" />
    </div>
    <h1 className="mt-6 text-3xl font-bold">Доступ запрещён</h1>
    <p className="mt-3 max-w-lg text-muted-foreground">
      У вас нет прав для открытия этого раздела. Для сотрудников доступен раздел бронирования, а админские панели видны только роли администратора.
    </p>
    <div className="mt-6 flex gap-3">
      <Button asChild>
        <Link to="/booking">Перейти к бронированию</Link>
      </Button>
      <Button variant="outline" asChild>
        <Link to="/">На главную</Link>
      </Button>
    </div>
  </div>
);

export default Forbidden;
