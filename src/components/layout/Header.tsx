import { Link, useNavigate } from "react-router-dom";
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
import { User, Settings, History, LogOut, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="text-xl font-bold tracking-tight text-primary">
          Desker
        </Link>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border bg-secondary px-3 py-1.5 text-sm font-medium transition hover:bg-accent">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline">{user.firstName}</span>
                {user.role === "admin" && <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 hidden sm:inline-flex">Admin</Badge>}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="mr-2 h-4 w-4" /> Профиль
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="mr-2 h-4 w-4" /> Настройки
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/history")}>
                <History className="mr-2 h-4 w-4" /> История
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Войти</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/register">Зарегистрироваться</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
