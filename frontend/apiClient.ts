type ApiError = {
  message: string;
  error?: unknown;
};

const isLocalDesktop =
  window.location.hostname.includes("localhost") ||
  window.location.hostname.includes("127.0.0.1");

const API_BASE_URL =
  (import.meta as any).env.VITE_API_BASE_URL ||
  (isLocalDesktop ? "http://localhost:5000" : "https://civic-pulse-ak6s.onrender.com");

const GET_TIMEOUT_MS = 30000;
const MUTATION_TIMEOUT_MS = 60000;

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getAuthToken(): string | null {
  return localStorage.getItem("token");
}

function toJsonError(payload: any): ApiError {
  if (payload && typeof payload === "object" && payload.message) {
    return payload as ApiError;
  }
  return { message: "Request failed", error: payload } as ApiError;
}

function isTimeoutError(err: unknown): boolean {
  const msg = (err as any)?.message ?? "";
  return String(msg).includes("too long to respond") || (err as any)?.name === "AbortError";
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      const timeoutErr = {
        name: "AbortError",
        message: "Server took too long to respond. The API may be waking up — try again in a moment.",
      };
      throw timeoutErr;
    }
    throw { message: err?.message || "Network error. Check your connection." };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOnce<T>(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<T> {
  const res = await fetchWithTimeout(url, init, timeoutMs);
  const text = await res.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }
  if (!res.ok) {
    throw toJsonError(payload);
  }
  return payload as T;
}

export async function apiRequest<T>(
  path: string,
  opts: {
    method?: string;
    token?: string | null;
    body?: any;
    headers?: Record<string, string>;
    isFormData?: boolean;
    timeoutMs?: number;
    retries?: number;
  } = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  const method = opts.method ?? "GET";
  const token = opts.token ?? getAuthToken();
  const isMutation = method !== "GET" && method !== "HEAD";
  const timeoutMs = opts.timeoutMs ?? (isMutation ? MUTATION_TIMEOUT_MS : GET_TIMEOUT_MS);
  const maxAttempts = (opts.retries ?? (isMutation ? 2 : 1)) + 1;

  const headers: Record<string, string> = {
    ...(opts.headers ?? {}),
  };

  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    if (opts.isFormData) {
      body = opts.body as FormData;
    } else {
      headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
      body = JSON.stringify(opts.body);
    }
  }

  if (token) headers["Authorization"] = `Bearer ${token}`;

  const init: RequestInit = {
    method,
    headers,
    body,
    credentials: "include",
  };

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetchOnce<T>(url, init, timeoutMs);
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts && isTimeoutError(err)) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

/** Ping API to wake Render free-tier instance (non-blocking). */
export function wakeApi(): void {
  fetchWithTimeout(`${API_BASE_URL}/api/health`, { method: "GET" }, 30000).catch(() => {});
}
