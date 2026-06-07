import { resolveOAuthReturnUrl } from "../config/env";

export type OAuthStatePayload = {
  returnTo: string;
  role: "CITIZEN" | "OFFICIAL";
};

export function encodeOAuthState(payload: OAuthStatePayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeOAuthState(state: unknown): OAuthStatePayload | null {
  if (typeof state !== "string" || !state) return null;
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as OAuthStatePayload;
    if (!parsed?.returnTo || !parsed?.role) return null;
    return {
      returnTo: resolveOAuthReturnUrl(parsed.returnTo),
      role: parsed.role === "OFFICIAL" ? "OFFICIAL" : "CITIZEN",
    };
  } catch {
    return null;
  }
}
