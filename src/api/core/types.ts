export type ApiResult<T> = {
  data: T;
  message?: string;
  statusCode?: number;
};

function isApiResult<T>(value: unknown): value is ApiResult<T> {
  if (!value || typeof value !== 'object') return false;
  return 'data' in value;
}

export function unwrapApiResult<T>(result: ApiResult<T> | T): T {
  if (isApiResult<T>(result)) return result.data;
  return result;
}
