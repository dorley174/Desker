import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info, LogIn } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, preferredHomeRoute } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const returnTo = useMemo(() => {
    const state = location.state as { from?: string } | null;
    return state?.from || preferredHomeRoute;
  }, [location.state, preferredHomeRoute]);

  const handleDemoLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const result = await login(email, password);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || "Не удалось войти");
      return;
    }

    navigate(returnTo, { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center px-4 py-10">
      <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-primary/15 bg-gradient-to-br from-card via-card to-muted/40 shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl">Вход в Desker</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Войдите в систему, чтобы выбрать рабочее место, посмотреть активные бронирования и продолжить работу в офисе без конфликтов по посадке.
            </p>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Тестовые аккаунты</AlertTitle>
              <AlertDescription className="mt-2 space-y-2 text-xs">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => handleDemoLogin("user@desker.io", "user123")}>
                    Сотрудник demo
                  </Button>
                  <Button variant="outline" size="sm" type="button" onClick={() => handleDemoLogin("admin@desker.io", "admin123")}>
                    Админ demo
                  </Button>
                </div>
                <div>
                  <div><code>user@desker.io</code> / <code>user123</code></div>
                  <div><code>admin@desker.io</code> / <code>admin123</code></div>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Авторизация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="name@company.com" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Пароль</Label>
                  {/* <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                    Забыли пароль?
                  </Link> */}
                </div>
                <Input id="password" type="password" placeholder="**********" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                <LogIn className="mr-2 h-4 w-4" />
                {submitting ? "Входим..." : "Войти"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Нет аккаунта? <Link to="/register" className="text-primary hover:underline">Зарегистрироваться</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
