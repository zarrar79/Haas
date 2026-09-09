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

/** Nested user payload shared across list/detail APIs. */
export type UserBrief = {
  id?: string;
  username?: string;
  email?: string;
  name?: string;
  last_name?: string;
  full_name?: string;
  media_url?: string | null;
};
