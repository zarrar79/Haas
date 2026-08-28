import "server-only";

import { callBackend } from "@/lib/call-backend";
import { errorResponse, successResponse } from "@/lib/bff-response";
import { decryptBackendPayload } from "@/lib/decrypt-backend-payload";
import { getClientIpAddress, getQueryString } from "@/lib/request-helpers";
import { getSessionToken } from "@/lib/session-cookie";

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
    return errorResponse("Unauthorized", 401);
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
      return new Response(djangoResponse.body, {
        status: djangoResponse.status,
        headers: {
          "Content-Type": responseContentType || "application/octet-stream",
        },
      });
    }

    const envelope = (await djangoResponse.json()) as DjangoEnvelope;

    if (!djangoResponse.ok || envelope.status === false) {
      return errorResponse(
        envelope.message ?? "Backend request failed",
        djangoResponse.status >= 400 ? djangoResponse.status : 400,
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
