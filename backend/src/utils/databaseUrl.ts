/** Strip accidental quotes/spaces Render users sometimes paste into env vars. */
export function sanitizeDatabaseUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  let url = raw.trim();
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim();
  }
  return url;
}

export function getDatabaseUrl(): string {
  const url = sanitizeDatabaseUrl(process.env.DATABASE_URL);
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}
