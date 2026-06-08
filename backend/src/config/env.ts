export const isProduction =
  process.env.NODE_ENV === "production" ||
  Boolean(process.env.RENDER) ||
  Boolean(process.env.RENDER_EXTERNAL_URL);

export function getFrontendUrl(): string {
  return (
    process.env.FRONTEND_ORIGIN?.replace(/\/$/, "") ||
    "https://civic-pulse-platform.vercel.app"
  );
}

export function getGoogleCallbackUrl(): string {
  if (process.env.GOOGLE_REDIRECT_URL) {
    return process.env.GOOGLE_REDIRECT_URL;
  }

  const backend =
    process.env.RENDER_EXTERNAL_URL?.replace(/\/$/, "") ||
    "https://civic-pulse-ak6s.onrender.com";

  return `${backend}/api/auth/google/callback`;
}

const ALLOWED_FRONTEND_PATTERNS = [
  /^https:\/\/civic-pulse-platform\.vercel\.app$/,
  /^https:\/\/[a-z0-9-]+-[a-z0-9-]+-[a-z0-9-]+\.vercel\.app$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  /^http:\/\/localhost:3000$/,
  /^http:\/\/127\.0\.0\.1:3000$/,
];

export function isAllowedFrontendOrigin(origin: string): boolean {
  const normalized = origin.replace(/\/$/, "");
  if (normalized === getFrontendUrl()) return true;
  return ALLOWED_FRONTEND_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function resolveOAuthReturnUrl(returnTo?: string | null): string {
  if (returnTo && isAllowedFrontendOrigin(returnTo)) {
    return returnTo.replace(/\/$/, "");
  }
  return getFrontendUrl();
}

export function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    secure: isProduction,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}
