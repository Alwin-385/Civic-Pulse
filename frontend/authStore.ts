import { UserRole } from "./types";

type JwtPayload = {
  id?: number;
  role?: string;
  exp?: number;
};

export function getStoredToken(): string | null {
  return localStorage.getItem("token");
}

export function setStoredAuth(token: string) {
  localStorage.setItem("token", token);

  const payload = decodeJwtPayload(token);
  if (payload?.id) localStorage.setItem("userId", String(payload.id));
  if (payload?.role) localStorage.setItem("role", payload.role);
}

export function setStoredRole(role: UserRole) {
  localStorage.setItem("role", role);
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  localStorage.removeItem("role");
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(jsonPayload) as JwtPayload;
  } catch {
    return null;
  }
}

export function getStoredRole(): UserRole | null {
  const raw = localStorage.getItem("role");
  if (raw === UserRole.CITIZEN) return UserRole.CITIZEN;
  if (raw === UserRole.OFFICIAL) return UserRole.OFFICIAL;
  // Backend enum is "CITIZEN"/"OFFICIAL", while frontend enum uses same string values.
  return null;
}

export function getStoredUserId(): number | null {
  const raw = localStorage.getItem("userId");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

