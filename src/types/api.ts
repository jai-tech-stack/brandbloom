export type ApiSuccess<T> = {
  success: true;
  data: T;
  error: null;
};

export type ApiError = {
  success: false;
  data: null;
  error: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
