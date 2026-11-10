import "server-only";

import { NextResponse } from "next/server";

import { callBackend } from "@/lib/call-backend";
import { errorResponse, successResponse } from "@/lib/bff-response";
import { decryptBackendPayload } from "@/lib/decrypt-backend-payload";
import { getClientIpAddress, getQueryString } from "@/lib/request-helpers";
import {
  getClearedSessionCookieOptions,
  getSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/session-cookie";

type DjangoEnvelope = {
  status?: boolean;
  message?: string;
  code?: number | string;
  data?: unknown;
  pagination?: unknown;
};

type ForwardToDjangoOptions = {
  request: Request;
  /** Path on Django, e.g. "haas/me/" or "haas/hackathons/" */
  backendPath: string;
  method?: string;
  /** Require a logged-in session cookie (default true). */
  requireSession?: boolean;
  body?: unknown;
  extraHeaders?: HeadersInit;
};

const AUTH_FAILURE_MESSAGE_RE =
  /token_not_valid|token is expired|invalid or expired token|given token not valid|not authenticated|authentication credentials|authentication required|session has expired|session superseded|signed in on another device/i;

function isDjangoAuthFailure(
  djangoStatus: number,
  envelope: DjangoEnvelope,
): boolean {
  if (djangoStatus === 401) return true;
  const code = envelope.code !== undefined ? String(envelope.code) : "";
  if (code === "401" || code === "unauthorized" || code === "token_not_valid") {
    return true;
  }
  const message = envelope.message ?? "";
  return AUTH_FAILURE_MESSAGE_RE.test(message);
}

function unauthorizedResponse(message = "Unauthorized") {
  const response = errorResponse(message, 401, "unauthorized");
  response.cookies.set(
    SESSION_COOKIE_NAME,
    "",
    getClearedSessionCookieOptions(),
  );
  return response;
}

/**
 * Reusable BFF forwarder:
 * browser → HAS /api/... → Django BACKEND_URL/...
 */
export async function forwardToDjango(options: ForwardToDjangoOptions) {
  const {
    request,
    backendPath,
    method = request.method,
    requireSession = true,
    body,
    extraHeaders,
  } = options;

  const accessToken = await getSessionToken();

  if (requireSession && !accessToken) {
    return unauthorizedResponse();
  }

  const pathWithQuery = `${backendPath.replace(/^\//, "")}${getQueryString(request)}`;

  let requestBody = body;
  const contentType = request.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");

  if (requestBody === undefined && method !== "GET" && method !== "HEAD") {
    if (isMultipart) {
      // Preserve multipart boundary — forward raw bytes as-is.
      requestBody = await request.arrayBuffer();
    } else {
      try {
        requestBody = await request.json();
      } catch {
        requestBody = undefined;
      }
    }
  }

  const forwardHeaders = new Headers(extraHeaders);
  if (isMultipart && contentType) {
    forwardHeaders.set("Content-Type", contentType);
  }

  try {
    const djangoResponse = await callBackend(pathWithQuery, {
      method,
      accessToken,
      clientIpAddress: getClientIpAddress(request),
      body: requestBody,
      headers: forwardHeaders,
    });

    const responseContentType =
      djangoResponse.headers.get("content-type") ?? "";

    if (!responseContentType.includes("application/json")) {
      if (djangoResponse.status === 401) {
        return unauthorizedResponse();
      }
      return new NextResponse(djangoResponse.body, {
        status: djangoResponse.status,
        headers: {
          "Content-Type": responseContentType || "application/octet-stream",
        },
      });
    }

    const envelope = (await djangoResponse.json()) as DjangoEnvelope;

    if (!djangoResponse.ok || envelope.status === false) {
      if (isDjangoAuthFailure(djangoResponse.status, envelope)) {
        return unauthorizedResponse(
          envelope.message ?? "Your session has expired. Please sign in again.",
        );
      }
      // Prefer Django's HTTP status; fall back to envelope.code, then 400.
      // (Some Django paths return HTTP 200 with status:false and code:4xx.)
      const envelopeCode =
        typeof envelope.code === "number"
          ? envelope.code
          : typeof envelope.code === "string" && /^\d+$/.test(envelope.code)
            ? Number(envelope.code)
            : undefined;
      const httpStatus =
        djangoResponse.status >= 400
          ? djangoResponse.status
          : envelopeCode !== undefined && envelopeCode >= 400
            ? envelopeCode
            : 400;
      return errorResponse(
        envelope.message ?? "Backend request failed",
        httpStatus,
        envelope.code !== undefined ? String(envelope.code) : undefined,
      );
    }

    const decryptedData = decryptBackendPayload(envelope.data);

    return successResponse({
      data: decryptedData ?? null,
      message: envelope.message ?? "Success",
      pagination: envelope.pagination ?? null,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to reach backend",
      502,
    );
  }
}
