import type { User } from "@/lib/types";

export function getUserDisplayName(user: User | null | undefined) {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  return fullName || user?.email || "Пользователь";
}

export function getUserInitials(user: User | null | undefined) {
  const firstInitial = (user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase();
  const lastInitial = (user?.lastName?.[0] || "").toUpperCase();
  return `${firstInitial}${lastInitial}`;
}

export function getUserFirstName(user: User | null | undefined) {
  return user?.firstName || "—";
}

export function getUserLastName(user: User | null | undefined) {
  return user?.lastName || "—";
}
