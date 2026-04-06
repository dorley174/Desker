import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Monitor, Calendar, Zap } from "lucide-react";

const features = [
  { icon: Monitor, title: "Интерактивная карта", desc: "Выбирайте место на карте этажа с фильтрами по оснащению." },
  { icon: Calendar, title: "Почасовая бронь", desc: "Бронируйте рабочее место на нужные часы — без переплат." },
  { icon: Zap, title: "Автоматическое освобождение", desc: "Система сама освободит место, если бронь не подтверждена." },
];

const Landing = () => (
  <div className="mx-auto max-w-5xl px-4 py-16 text-center">
    <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
      Бронирование рабочих мест — <span className="text-primary">просто</span>
    </h1>
    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
      Desker помогает вашей команде эффективно использовать офисное пространство. Выбирайте место, бронируйте и работайте.
    </p>
    <div className="mt-8 flex justify-center gap-4">
      <Button size="lg" asChild>
        <Link to="/register">Начать бесплатно</Link>
      </Button>
      <Button size="lg" variant="outline" asChild>
        <Link to="/login">Войти</Link>
      </Button>
    </div>

    <div className="mt-20 grid gap-8 sm:grid-cols-3">
      {features.map((f) => (
        <div key={f.title} className="rounded-xl border bg-card p-6 text-left shadow-sm">
          <f.icon className="h-8 w-8 text-primary mb-3" />
          <h3 className="font-semibold text-lg">{f.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
        </div>
      ))}
    </div>
  </div>
);

export default Landing;
