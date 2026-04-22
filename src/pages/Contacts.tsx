import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const contacts = [
  { name: "Данил Валиев", role: "DevOps инженер", handle: "@dorley" },
  { name: "Валерия Колесникова", role: "Frontend-разработчик", handle: "@codekd" },
  { name: "Олеся Новосёлова", role: "Backend-разработчик", handle: "@wkwthigo" },
  { name: "Елизавета Загурских", role: "Аналитик", handle: "@doiwannaknoww8" },
];

const Contacts = () => (
  <div className="mx-auto max-w-5xl px-4 py-8">
    <div className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight">Контакты команды</h1>
      <p className="mt-2 text-muted-foreground">
        Приветствуем вас на странице контактов нашей команды!
      </p>
      <p className="mt-2 text-muted-foreground">
        Здесь вы можете найти контакты команды разработчиков для связи по любому поводу!
      </p>
    </div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {contacts.map((person, index) => (
        <Card key={`${person.name}-${index}`} className="overflow-hidden">
          <CardHeader className="bg-muted/50">
            <CardTitle className="text-lg">{person.name}</CardTitle>
            <CardDescription>{person.role}</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              Связаться в Telegram: <span className="font-medium text-foreground">{person.handle}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default Contacts;
