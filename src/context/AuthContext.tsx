import React, { createContext, useContext, useState, ReactNode } from "react";

// TODO: replace with Supabase Auth + user_roles table

export type UserRole = "admin" | "employee";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  register: (email: string, firstName: string, lastName: string, password: string, inviteCode?: string) => { success: boolean; error?: string };
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---------- Mock data ----------

// Test accounts (TODO: replace with Supabase auth)
const MOCK_ACCOUNTS: Record<string, { password: string; user: User }> = {
  "admin@desker.io": {
    password: "admin123",
    user: {
      id: "admin-1",
      email: "admin@desker.io",
      firstName: "Админ",
      lastName: "Десков",
      role: "admin",
    },
  },
  "user@desker.io": {
    password: "user123",
    user: {
      id: "user-1",
      email: "user@desker.io",
      firstName: "Иван",
      lastName: "Петров",
      role: "employee",
    },
  },
};

// Valid invite codes (TODO: replace with Supabase table lookup)
const VALID_INVITE_CODES: Record<string, UserRole> = {
  "ADMIN2026": "admin",
  "JOIN2026": "employee",
};

// ---------- Provider ----------

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, password: string): boolean => {
    // TODO: replace with Supabase auth.signInWithPassword
    const account = MOCK_ACCOUNTS[email.toLowerCase()];
    if (account && account.password === password) {
      setUser(account.user);
      return true;
    }
    // Fallback: allow any email/password for demo (as employee)
    setUser({
      id: "demo-" + Date.now(),
      email,
      firstName: "Demo",
      lastName: "User",
      role: "employee",
    });
    return true;
  };

  const register = (
    email: string,
    firstName: string,
    lastName: string,
    _password: string,
    inviteCode?: string
  ): { success: boolean; error?: string } => {
    // TODO: replace with Supabase auth.signUp + invite code validation
    let role: UserRole = "employee";

    if (inviteCode && inviteCode.trim() !== "") {
      const mappedRole = VALID_INVITE_CODES[inviteCode.trim().toUpperCase()];
      if (!mappedRole) {
        return { success: false, error: "Неверный инвайт-код" };
      }
      role = mappedRole;
    }

    setUser({
      id: "reg-" + Date.now(),
      email,
      firstName,
      lastName,
      role,
    });
    return { success: true };
  };

  const logout = () => {
    // TODO: replace with Supabase auth.signOut
    setUser(null);
  };

  const updateProfile = (data: Partial<User>) => {
    // TODO: replace with Supabase update
    if (user) setUser({ ...user, ...data });
  };

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
