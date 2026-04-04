type ApiError = {
  message: string;
  error?: unknown;
};

const isLocalDesktop = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');

const API_BASE_URL =
  (import.meta as any).env.VITE_API_BASE_URL || (isLocalDesktop ? 'http://localhost:5000' : 'https://civic-pulse-ak6s.onrender.com');

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getAuthToken(): string | null {
  return localStorage.getItem("token");
}

function toJsonError(payload: any): ApiError {
  if (payload && typeof payload === "object" && payload.message) {
    // Keep extra fields (e.g., verificationRequired/email) for UI logic.
    return payload as ApiError;
  }
  return { message: "Request failed", error: payload } as ApiError;
}

export async function apiRequest<T>(
  path: string,
  opts: {
    method?: string;
    token?: string | null;
    body?: any;
    headers?: Record<string, string>;
    isFormData?: boolean;
  } = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  const method = opts.method ?? "GET";
  const token = opts.token ?? getAuthToken();

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

  const res = await fetch(url, {
    method,
    headers,
    body,
    credentials: "include",
  });
  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw toJsonError(payload);
  }

  return payload as T;
}

