import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CalendarRange, History, LayoutDashboard, LogOut, Settings, User } from "lucide-react";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? "text-foreground font-medium"
    : "text-muted-foreground transition hover:text-foreground";

const Header = () => {
  const { user, logout, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-bold tracking-tight text-primary">
            Desker
          </Link>
          {user ? (
            <nav className="hidden items-center gap-4 text-sm md:flex">
              <NavLink to="/booking" className={linkClass}>
                Бронирование
              </NavLink>
              <NavLink to="/history" className={linkClass}>
                Мои брони
              </NavLink>
              {isAdmin ? (
                <NavLink to="/admin" className={linkClass}>
                  Админка
                </NavLink>
              ) : null}
            </nav>
          ) : null}
        </div>

        {loading ? null : user ? (
          <div className="flex items-center gap-3">
            {isAdmin ? <Badge variant="secondary">Admin</Badge> : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm shadow-sm transition hover:bg-accent">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {(user.firstName?.[0] || user.email?.[0] || "U").toUpperCase()}
                      {(user.lastName?.[0] || "").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left sm:block">
                    <div className="font-medium leading-tight">{user.firstName} {user.lastName}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate("/booking")}>
                  <CalendarRange className="mr-2 h-4 w-4" /> Бронирование
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/history")}>
                  <History className="mr-2 h-4 w-4" /> Мои брони
                </DropdownMenuItem>
                {isAdmin ? (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Админ-панель
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" /> Профиль
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="mr-2 h-4 w-4" /> Настройки
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link to="/login">Войти</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Регистрация</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
