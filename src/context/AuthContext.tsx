import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { api, setStoredToken } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    firstName: string,
    lastName: string,
    password: string,
    inviteCode?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (
    data: Partial<User> & { password?: string },
  ) => Promise<{ success: boolean; error?: string }>;
  isAdmin: boolean;
  preferredHomeRoute: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const token = localStorage.getItem("desker_token");
        if (!token) {
          setUser(null);
          return;
        }

        const currentUser = await api.me();
        setUser(currentUser);
      } catch {
        setStoredToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    void hydrate();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.login(email, password);
      setStoredToken(response.token);
      setUser(response.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Ошибка входа",
      };
    }
  };

  const register = async (
    email: string,
    firstName: string,
    lastName: string,
    password: string,
    inviteCode?: string,
  ) => {
    try {
      const response = await api.register({
        email,
        firstName,
        lastName,
        password,
        inviteCode,
      });
      setStoredToken(response.token);
      setUser(response.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Ошибка регистрации",
      };
    }
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
  };

  const updateProfile = async (data: Partial<User> & { password?: string }) => {
    try {
      const updated = await api.updateMe({
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
      });
      setUser(updated);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Ошибка обновления профиля",
      };
    }
  };

  const isAdmin = user?.role === "admin";

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      updateProfile,
      isAdmin,
      preferredHomeRoute: isAdmin ? "/admin" : "/booking",
    }),
    [user, loading, isAdmin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
