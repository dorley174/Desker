import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const contacts = [
  { name: "Имя Фамилия", role: "Роль в проекте", handle: "@username" },
  { name: "Имя Фамилия", role: "Роль в проекте", handle: "@username" },
  { name: "Имя Фамилия", role: "Роль в проекте", handle: "@username" },
];

const Contacts = () => (
  <div className="mx-auto max-w-5xl px-4 py-8">
    <div className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight">Контакты команды</h1>
      <p className="mt-2 text-muted-foreground">
        Здесь можно указать состав команды проекта, роли участников и удобный способ связи.
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
              Контакт через <span className="font-medium text-foreground">{person.handle}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default Contacts;
