export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiFailure = {
  ok: false;
  message: string;
  code?: string;
};

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export type UserProfile = {
  id: string;
  email: string;
  username?: string;
  name?: string;
  last_name?: string;
};
