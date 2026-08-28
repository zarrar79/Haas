import { NextResponse } from "next/server";

import type { ApiFailure, ApiSuccess } from "@/types";

/** Standard success JSON for BFF routes. */
export function successResponse<T>(data: T, httpStatus = 200) {
  const body: ApiSuccess<T> = { ok: true, data };
  return NextResponse.json(body, { status: httpStatus });
}

/** Standard error JSON for BFF routes. */
export function errorResponse(
  message: string,
  httpStatus = 400,
  code?: string,
) {
  const body: ApiFailure = { ok: false, message, code };
  return NextResponse.json(body, { status: httpStatus });
}
