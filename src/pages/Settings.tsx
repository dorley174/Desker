import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { user, updateProfile, logout } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isDirty = useMemo(
    () => firstName !== user?.firstName || lastName !== user?.lastName || password.length > 0,
    [firstName, lastName, password, user?.firstName, user?.lastName],
  );

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const result = await updateProfile({ firstName, lastName, password: password || undefined });
    setSaving(false);

    if (!result.success) {
      setError(result.error || "Не удалось сохранить настройки");
      return;
    }

    setPassword("");
    toast.success("Настройки сохранены");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Настройки аккаунта</h1>
        <p className="mt-2 text-muted-foreground">
          Здесь можно обновить имя, фамилию и пароль. Изменения сохраняются на сервере и будут доступны с любого устройства после входа.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Личные данные</CardTitle>
          <CardDescription>Смена имени и пароля без выхода из системы</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="firstName">Имя</Label><Input id="firstName" value={firstName} onChange={(event) => setFirstName(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="lastName">Фамилия</Label><Input id="lastName" value={lastName} onChange={(event) => setLastName(event.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="password">Новый пароль</Label><Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Оставьте пустым, если пароль менять не нужно" /></div>
          <div className="flex flex-col gap-2 sm:flex-row"><Button disabled={!isDirty || saving} onClick={handleSave}>{saving ? "Сохраняем..." : "Сохранить изменения"}</Button><Button variant="outline" onClick={() => navigate(-1)}>Назад</Button><Button variant="destructive" className="sm:ml-auto" onClick={() => { logout(); navigate("/"); }}>Выйти из аккаунта</Button></div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
