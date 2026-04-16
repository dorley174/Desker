import { useState } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { KeyRound, MailCheck } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);

  const requestResetCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      const response = await api.forgotPassword(email);
      setRequestMessage(response.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось отправить код");
    } finally {
      setSending(false);
    }
  };

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setResetting(true);
    setError("");
    try {
      const response = await api.resetPassword({ email, code, newPassword });
      setRequestMessage(response.message);
      setCode("");
      setNewPassword("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось сбросить пароль");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center px-4 py-10">
      <div className="grid w-full gap-6 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Шаг 1. Получить код</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={requestResetCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={sending}>
                <MailCheck className="mr-2 h-4 w-4" />
                {sending ? "Готовим код..." : "Показать код"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Шаг 2. Сбросить пароль</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={resetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Код восстановления</Label>
                <Input id="code" inputMode="numeric" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value)} placeholder="123456" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Новый пароль</Label>
                <Input id="newPassword" type="password" minLength={6} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={resetting || !email}>
                <KeyRound className="mr-2 h-4 w-4" />
                {resetting ? "Обновляем пароль..." : "Сбросить пароль"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-6 left-1/2 z-50 w-[min(40rem,calc(100%-2rem))] -translate-x-1/2">
        {requestMessage ? (
          <Alert className="shadow-lg">
            <AlertTitle>Готово</AlertTitle>
            <AlertDescription>{requestMessage}</AlertDescription>
          </Alert>
        ) : null}
        {error ? (
          <Alert variant="destructive" className="mt-3 shadow-lg">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <div className="fixed top-[88px] right-4 hidden rounded-xl border bg-card p-4 text-sm text-muted-foreground shadow-lg xl:block">
        <p className="font-medium text-foreground">Подсказка</p>
        <p className="mt-2 max-w-xs">
          Это автономный демо-режим: после первого шага приложение покажет код прямо на экране. Для тестовых аккаунтов используется код <code>123456</code>.
        </p>
        <Link to="/login" className="mt-3 inline-block text-primary hover:underline">
          Вернуться ко входу
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;
