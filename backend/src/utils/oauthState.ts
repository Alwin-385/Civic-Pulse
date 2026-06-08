import { resolveOAuthReturnUrl } from "../config/env";
import { isDatabaseConnectionError, isDatabaseSchemaError } from "./dbError";

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

export function mapOAuthErrorCode(err: unknown): string {
  const message = (err as any)?.message?.toLowerCase?.() ?? String(err).toLowerCase();
  if (message.includes("redirect_uri")) return "oauth_redirect_mismatch";
  if (message.includes("access_denied") || message.includes("denied")) return "oauth_access_denied";
  if (message.includes("invalid_client") || message.includes("unauthorized_client")) return "oauth_invalid_client";
  if (message.includes("state")) return "oauth_state";
  if (isDatabaseSchemaError(err)) return "database_schema";
  if (isDatabaseConnectionError(err)) return "database_unavailable";
  return "google_login_failed";
}
