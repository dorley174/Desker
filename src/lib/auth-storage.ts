import { setStoredToken } from "@/lib/api";

export function clearAuthStorage() {
  setStoredToken(null);
}
