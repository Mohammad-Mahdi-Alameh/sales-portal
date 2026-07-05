/** Pagination block returned by every list endpoint. */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Single / mutation envelope: { success, message, data }. */
export interface ApiEnvelope<T> {
  success: true;
  message?: string;
  data: T;
}

/** List envelope: { success, data[], pagination, stats }. */
export interface ListEnvelope<T> {
  success: true;
  message?: string;
  data: T[];
  pagination: Pagination;
  stats?: Record<string, unknown>;
}

/** Error envelope: { success:false, error:{ code, message, details } }. */
export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Normalized error thrown by the API client. */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Result wrapper for list calls that keeps pagination + stats alongside rows. */
export interface ListResult<T> {
  data: T[];
  pagination: Pagination;
  stats?: Record<string, unknown>;
}
