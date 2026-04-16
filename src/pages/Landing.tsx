import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock, ClipboardCheck, HardDriveDownload, MapPinned, ShieldCheck, Sparkles, Users } from "lucide-react";

const features = [
  {
    icon: MapPinned,
    title: "Поиск места на этаже",
    description: "Фильтруйте рабочие места по этажу, зоне, статусу и доступному оснащению.",
  },
  {
    icon: CalendarClock,
    title: "Интервальное бронирование",
    description: "Выбирайте нужные часы, создавайте серию еженедельных бронирований и быстро занимайте место прямо сейчас.",
  },
  {
    icon: ClipboardCheck,
    title: "Мои брони и история",
    description: "Отслеживайте активные резервы, прошлые визиты и отменяйте ненужные брони без лишних переходов.",
  },
  {
    icon: Users,
    title: "Роли и разграничение доступа",
    description: "Сотрудники получают чистый сценарий бронирования, а администраторы — отдельный operational dashboard.",
  },
  {
    icon: HardDriveDownload,
    title: "Без backend и API",
    description: "Приложение запускается автономно: встроенные заглушки имитируют сервисы, а данные живут в localStorage браузера.",
  },
  {
    icon: Sparkles,
    title: "Автоподбор места",
    description: "Система рекомендует лучшее доступное место по выбранным фильтрам и текущей загрузке.",
  },
];

const Landing = () => (
  <div className="mx-auto max-w-6xl px-4 py-16">
    <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
      <div>
        <Badge variant="secondary" className="mb-4 rounded-full px-3 py-1 text-xs">
          Office booking platform
        </Badge>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Desker — удобное бронирование рабочих мест для гибридного офиса
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Интерфейс собран вокруг реальных сценариев из бизнес-аналитики: поиск места, walk-in, серийные брони, личная история и ролевой доступ для администраторов.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link to="/register">Создать аккаунт</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/login">Войти</Link>
          </Button>
        </div>
        <div className="mt-8 flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span className="rounded-full border px-3 py-1">Почасовые слоты 08:00–20:00</span>
          <span className="rounded-full border px-3 py-1">Инвайт-коды</span>
          <span className="rounded-full border px-3 py-1">История и отмена</span>
          <span className="rounded-full border px-3 py-1">Локальное демо-хранилище</span>
        </div>
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-card to-muted/40 shadow-xl">
        <CardHeader>
          <CardTitle>Быстрый старт</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="rounded-xl border bg-background p-4">
            <div className="font-semibold text-foreground">Тестовые аккаунты</div>
            <div className="mt-2 space-y-1">
              <p>Администратор: <code>admin@desker.io</code> / <code>admin123</code></p>
              <p>Сотрудник: <code>user@desker.io</code> / <code>user123</code></p>
            </div>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <div className="font-semibold text-foreground">Инвайт-коды</div>
            <div className="mt-2 space-y-1">
              <p><code>ADMIN2026</code> — роль администратора</p>
              <p><code>JOIN2026</code> — роль сотрудника</p>
            </div>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <div className="flex items-center gap-2 font-semibold text-foreground"><ShieldCheck className="h-4 w-4" /> Автономный режим</div>
            <p className="mt-2">Все операции выполняются во встроенном mock-сервисе. После перезагрузки браузера данные сохраняются, потому что лежат в localStorage.</p>
          </div>
          <p>
            После входа сотрудник попадает на карту мест, а администратор — в operational dashboard с аналитикой загрузки.
          </p>
        </CardContent>
      </Card>
    </div>

    <div className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {features.map((feature) => (
        <Card key={feature.title} className="h-full rounded-2xl shadow-sm">
          <CardContent className="flex h-full flex-col gap-3 p-6">
            <feature.icon className="h-8 w-8 text-primary" />
            <h3 className="text-lg font-semibold">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default Landing;
