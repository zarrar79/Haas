import type { ApiResult } from "@/types";

/** Envelope returned by forwardToDjango successResponse */
export type HaasForwardPayload<T> = {
  data: T;
  message?: string;
  pagination?: {
    count?: number;
    next?: string | null;
    previous?: string | null;
    page?: number;
    limit?: number;
  } | null;
};

/** Build `/api/haas/...` paths with optional query (no trailing slash — Next 308 drops write bodies). */
export function haasApiPath(
  path: string,
  query?: Record<string, string | undefined | null>,
) {
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

export function unwrapHaasResult<T>(result: ApiResult<HaasForwardPayload<T>>): {
  data: T;
  message?: string;
  pagination?: HaasForwardPayload<T>["pagination"];
} {
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
