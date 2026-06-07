export function isDatabaseConnectionError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  return (
    message.includes("Can't reach database server") ||
    message.includes("PrismaClientInitializationError") ||
    message.includes("Connection refused") ||
    message.includes("ENOTFOUND") ||
    message.includes("getaddrinfo")
  );
}

export const DATABASE_UNAVAILABLE_MESSAGE =
  "Database is unavailable. Ensure your Supabase project is active and DATABASE_URL in backend/.env is correct.";
