import { callAppApi } from "@/lib/client-api";
import type { ApiResult } from "@/types";

export type HaasQuery = Record<string, string | undefined | null>;

export type HaasPagination = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  page?: number;
  limit?: number;
} | null;

/** Envelope returned by forwardToDjango successResponse */
export type HaasForwardPayload<T> = {
  data: T;
  message?: string;
  pagination?: HaasPagination;
};

export type HaasUnwrapped<T> = {
  data: T;
  message?: string;
  pagination?: HaasPagination;
};

type HaasRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

/** Build `/api/haas/...` paths with optional query (no trailing slash — Next 308 drops write bodies). */
export function haasApiPath(path: string, query?: HaasQuery) {
  const clean = path.replace(/^\/+/, "").replace(/\/+$/, "");
  const base = `/api/haas/${clean}`;
  if (!query) return base;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function unwrapHaasResult<T>(
  result: ApiResult<HaasForwardPayload<T>>,
): HaasUnwrapped<T> {
  if (!result.ok) {
    throw new Error(result.message || "Request failed");
  }
  return {
    data: result.data.data,
    message: result.data.message,
    pagination: result.data.pagination,
  };
}

/** Normalize list payloads (array or { results: [] }). */
export function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (
    data &&
    typeof data === "object" &&
    "results" in data &&
    Array.isArray((data as { results: unknown }).results)
  ) {
    return (data as { results: T[] }).results;
  }
  return [];
}

export async function haasCall<T>(
  path: string,
  options?: HaasRequestOptions,
): Promise<HaasUnwrapped<T>> {
  const result = await callAppApi<ApiResult<HaasForwardPayload<T>>>(path, options);
  return unwrapHaasResult(result);
}

export async function haasGet<T>(path: string, query?: HaasQuery): Promise<T> {
  return (await haasCall<T>(haasApiPath(path, query))).data;
}

export async function haasList<T>(path: string, query?: HaasQuery): Promise<T[]> {
  return asList<T>(await haasGet<unknown>(path, query));
}

export async function haasListPage<T>(path: string, query?: HaasQuery) {
  const unwrapped = await haasCall<unknown>(haasApiPath(path, query));
  return {
    items: asList<T>(unwrapped.data),
    pagination: unwrapped.pagination,
    message: unwrapped.message,
  };
}

export async function haasSend<T>(
  path: string,
  options: HaasRequestOptions,
): Promise<T> {
  return (await haasCall<T>(haasApiPath(path), options)).data;
}

export function appendFormFields(
  form: FormData,
  body: Record<string, unknown>,
): FormData {
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === "object") {
      form.append(key, JSON.stringify(value));
    } else {
      form.append(key, String(value));
    }
  }
  return form;
}

export function toFormData(
  body: Record<string, unknown>,
  extras?: {
    file?: File | null;
    fileField?: string;
    flags?: Record<string, boolean | undefined>;
  },
): FormData {
  const form = appendFormFields(new FormData(), body);
  if (extras?.file) form.append(extras.fileField ?? "file", extras.file);
  if (extras?.flags) {
    for (const [key, value] of Object.entries(extras.flags)) {
      if (value) form.append(key, "true");
    }
  }
  return form;
}
