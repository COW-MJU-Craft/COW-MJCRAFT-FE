import {
  clearAuth,
  getAccessToken,
  getRefreshToken,
  updateTokens,
} from "../../utils/auth/auth";

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

export type DownloadResult = {
  blob: Blob;
  fileName: string;
};

type ApiResultType = "SUCCESS" | "FAIL";

type ApiEnvelope<T> = {
  resultType: ApiResultType;
  httpStatusCode: number;
  message: string;
  data: T | null;
};

export const REFRESH_PATH = "/admin/refresh";

// 동시에 여러 요청이 401을 받아도 재발급은 한 번만 수행하고,
// 나머지는 그 결과를 함께 기다린다.
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  // api()를 거치면 재발급 응답의 401이 다시 재발급을 부르므로 fetch를 직접 쓴다.
  try {
    const res = await fetch(withApiBase(REFRESH_PATH), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      credentials: "include",
    });

    if (!res.ok) return false;

    const text = await res.text();
    const parsed: unknown = text ? safeJsonParse(text) : null;
    const payload = isApiEnvelope(parsed) ? parsed.data : parsed;

    if (!payload || typeof payload !== "object") return false;

    const record = payload as Record<string, unknown>;
    const accessToken = record["accessToken"];
    if (typeof accessToken !== "string" || !accessToken) return false;

    const nextRefreshToken = record["refreshToken"];
    updateTokens({
      accessToken,
      // 회전형이므로 새 refresh token이 함께 온다
      refreshToken:
        typeof nextRefreshToken === "string" ? nextRefreshToken : null,
    });
    return true;
  } catch {
    return false;
  }
}

function refreshOnce(): Promise<boolean> {
  refreshPromise ??= refreshAccessToken().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export async function api<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  return request<T>(path, opts, true);
}

export async function download(
  path: string,
  fallbackFileName: string,
): Promise<DownloadResult> {
  const res = await requestResponse(path, {}, true);
  const contentType = res.headers.get('content-type') ?? '';
  if (
    !contentType.includes(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ) &&
    !contentType.includes('application/octet-stream')
  ) {
    const data = await readResponseData(res);
    throw new ApiError(
      res.status,
      data,
      extractErrorMessage(data) ?? '다운로드 파일 형식을 확인하지 못했습니다.',
    );
  }

  const blob = await res.blob();
  if (blob.size === 0) {
    throw new Error('다운로드할 주문 데이터가 없습니다.');
  }
  return {
    blob,
    fileName: fileNameFromHeader(
      res.headers.get('content-disposition'),
      fallbackFileName,
    ),
  };
}

async function request<T>(
  path: string,
  opts: RequestOptions,
  allowRefresh: boolean,
): Promise<T> {
  const res = await requestResponse(path, opts, allowRefresh);
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data: unknown = text ? safeJsonParse(text) : null;

  if (isApiEnvelope(data)) {
    if (data.resultType === "FAIL") {
      throw new ApiError(res.status, data, data.message || "Request failed");
    }
    return data.data as T;
  }

  return data as T;
}

async function requestResponse(
  path: string,
  opts: RequestOptions,
  allowRefresh: boolean,
): Promise<Response> {
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

  if (!res.ok) {
    const data = await readResponseData(res);
    if (res.status === 401) {
      // 인증이 걸린 요청만 재발급 대상이다. 비회원 조회 API의 401(비밀번호 불일치)은
      // 재발급으로 해결되지 않으므로 Authorization 헤더가 있었는지로 구분한다.
      const canRefresh =
        allowRefresh &&
        Boolean(token) &&
        !path.endsWith(REFRESH_PATH) &&
        Boolean(getRefreshToken());

      if (canRefresh && (await refreshOnce())) {
        return requestResponse(path, opts, false);
      }

      clearAuth();
    }
    let msg = extractErrorMessage(data);
    if (!msg && data) {
      msg = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    }
    throw new ApiError(res.status, data, msg);
  }

  return res;
}

async function readResponseData(res: Response): Promise<unknown> {
  const text = await res.text();
  return text ? safeJsonParse(text) : null;
}

function fileNameFromHeader(header: string | null, fallback: string) {
  const encoded = header?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return fallback;
    }
  }
  const plain = header?.match(/filename="?([^";]+)"?/i)?.[1];
  return plain?.trim() || fallback;
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
