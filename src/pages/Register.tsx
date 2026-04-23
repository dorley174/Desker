import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const Register = () => {
  const navigate = useNavigate();
  const { register, preferredHomeRoute } = useAuth();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("JOIN2026");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const result = await register(email, firstName, lastName, password, inviteCode || undefined);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || "Не удалось зарегистрироваться");
      return;
    }

    toast({
      title: "Аккаунт создан",
      description: "Профиль активирован, можно переходить к бронированию.",
    });
    navigate(preferredHomeRoute, { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center px-4 py-10">
      <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-primary/15 bg-gradient-to-br from-card via-card to-muted/40 shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl">Регистрация аккаунта</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Здесь необходимо ввести свои данные для создания учётной записи. 
            </p>
            <p>
              Роль назначается инвайт-кодом. В зависимости от кода, который вы используете при регистрации, вам будет присвоена роль сотрудника или администратора.
            </p>
            {/* <div className="rounded-xl border bg-background p-4">
              <div className="font-medium text-foreground">Демо-коды</div>
              <div className="mt-2 space-y-1 text-xs">
                <div><code>JOIN2026</code> — сотрудник</div>
                <div><code>ADMIN2026</code> — администратор</div>
              </div>
            </div> */}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Создание аккаунта</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Имя</Label>
                  <Input id="firstName" placeholder="Иван" required value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Фамилия</Label>
                  <Input id="lastName" placeholder="Иванов" required value={lastName} onChange={(event) => setLastName(event.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="name@company.com" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input id="password" type="password" placeholder="**********" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inviteCode">Инвайт-код</Label>
                <Input id="inviteCode" required value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} />
              </div>

              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Создаём аккаунт..." : "Зарегистрироваться"}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Уже есть аккаунт? <Link to="/login" className="text-primary hover:underline">Войти</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
