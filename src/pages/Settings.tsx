import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const isDirty =
    firstName !== user?.firstName ||
    lastName !== user?.lastName ||
    password.length > 0;

  const handleSave = async () => {
    setError("");
    const result = await updateProfile({
      firstName,
      lastName,
      password: password || undefined,
    });
    if (result.success) {
      toast.success("Профиль обновлён");
      setPassword("");
      return;
    }
    setError(result.error || "Не удалось сохранить изменения");
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Назад
      </Button>
      <h1 className="mb-6 text-2xl font-bold">Настройки</h1>

      <div className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="space-y-1">
          <Label>Имя</Label>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Фамилия</Label>
          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Новый пароль</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Оставьте пустым, чтобы не менять"
          />
        </div>
        <div className="space-y-1">
          <Label>Аватар</Label>
          {/* TODO: replace with file upload to Supabase Storage */}
          <Input type="file" accept="image/*" />
        </div>

        {isDirty && (
          <Button onClick={handleSave} className="w-full">
            Сохранить изменения
          </Button>
        )}

        <Button
          variant="destructive"
          className="w-full"
          onClick={() => {
            logout();
            navigate("/");
          }}
        >
          Выйти из аккаунта
        </Button>
      </div>
    </div>
  );
};

export default Settings;
