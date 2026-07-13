import { clearAuth, getAccessToken } from "../utils/auth";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(
  /\/$/,
  "",
);
export const withApiBase = (path: string) =>
  API_BASE ? `${API_BASE}${path}` : path;

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `API Error: ${status}`);
    this.status = status;
    this.body = body;
  }
}

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
};

type ApiResultType = "SUCCESS" | "FAIL";

type ApiEnvelope<T> = {
  resultType: ApiResultType;
  httpStatusCode: number;
  message: string;
  data: T | null;
};

export async function api<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const method = opts.method ?? "GET";

  const headers: Record<string, string> = {
    ...(opts.headers ?? {}),
  };

  const hasBody = opts.body !== undefined;
  if (hasBody) headers["Content-Type"] = "application/json";

  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(path, {
    method,
    headers,
    body: hasBody ? JSON.stringify(opts.body) : undefined,
    credentials: "include",
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data: unknown = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    if (res.status === 401) {
      clearAuth();
    }
    let msg = extractErrorMessage(data);
    if (!msg && data) {
      msg = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    }
    throw new ApiError(res.status, data, msg);
  }

  if (isApiEnvelope(data)) {
    if (data.resultType === "FAIL") {
      throw new ApiError(res.status, data, data.message || "Request failed");
    }
    return data.data as T;
  }

  return data as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function extractErrorMessage(data: unknown): string | undefined {
  if (!data) return undefined;

  if (typeof data === "string") return data;

  if (typeof data === "object") {
    const record = data as Record<string, unknown>;
    const msg = record["message"];
    if (typeof msg === "string" && msg.trim().length > 0) return msg;

    const alt = record["error"] ?? record["detail"] ?? record["msg"];
    if (typeof alt === "string" && alt.trim().length > 0) return alt;
  }

  return undefined;
}

function isApiEnvelope(data: unknown): data is ApiEnvelope<unknown> {
  if (!data || typeof data !== "object") return false;

  const record = data as Record<string, unknown>;
  const resultType = record["resultType"];
  const httpStatusCode = record["httpStatusCode"];
  const message = record["message"];

  return (
    (resultType === "SUCCESS" || resultType === "FAIL") &&
    typeof httpStatusCode === "number" &&
    typeof message === "string" &&
    "data" in record
  );
}
