const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8001";

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  // Add timeout controller (default 5s)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: "include", // send cookies (session & csrf)
      signal: options.signal || controller.signal,
    });
    clearTimeout(timeoutId);

    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json() : null;

    if (!res.ok) {
      const errorMessage =
        data?.detail || data?.message || `Lỗi HTTP ${res.status}: ${res.statusText}`;
      return { data: null, error: errorMessage, status: res.status };
    }

    return { data, error: null, status: res.status };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      return {
        data: null,
        error: "Quá thời gian kết nối tới máy chủ backend (Timeout).",
        status: 0,
      };
    }
    return {
      data: null,
      error: err.message || "Không thể kết nối tới máy chủ backend.",
      status: 0,
    };
  }
}
