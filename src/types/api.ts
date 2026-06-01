export interface ApiResponse<T = any> {
  code: number;
  message?: string;
  result?: T;
}

export interface ApiError {
  response?: {
    data?: {
      code?: number;
      message?: string;
    };
  };
  message?: string;
}

export interface PaginatedResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
