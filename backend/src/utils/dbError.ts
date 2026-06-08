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
    message.includes("ECONNREFUSED") ||
    message.includes("ENOTFOUND") ||
    message.includes("getaddrinfo") ||
    message.includes("ETIMEDOUT")
  );
}

export function isDatabaseSchemaError(error: unknown): boolean {
  const code = (error as any)?.code;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return code === "P2022" || message.includes("does not exist in the current database");
}

export const DATABASE_UNAVAILABLE_MESSAGE =
  "Database is unavailable. Ensure your Supabase project is active and DATABASE_URL in backend/.env is correct.";
