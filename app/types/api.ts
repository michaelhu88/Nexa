/**
 * Generic API types for NocoBase responses
 */

export interface ApiResponse<T = any> {
  data: T;
  meta?: {
    count?: number;
    page?: number;
    pageSize?: number;
    totalPage?: number;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  errors?: Array<{
    field?: string;
    message: string;
  }>;
}

export interface ApiErrorResponse {
  error: ApiError;
}
