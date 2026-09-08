export type PaginationMeta = { page: number; limit: number; total: number; totalPages: number };
export type ApiValidationError = { field?: string; message: string };
export type ApiResult<T> = { data: T; message?: string; pagination?: PaginationMeta };
export type ApiErrorPayload = { message: string; status: number; code?: string; validationErrors?: ApiValidationError[] };
