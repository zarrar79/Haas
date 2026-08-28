import { errorResponse } from "@/lib/bff-response";
import { callBackendJson } from "@/lib/call-backend";
import { decryptBackendPayload } from "@/lib/decrypt-backend-payload";
import { forwardToDjango } from "@/lib/forward-to-django";
import { isPlatformChallengeOperator } from "@/lib/is-platform-operator";
import { getClientIpAddress } from "@/lib/request-helpers";
import { getSessionToken } from "@/lib/session-cookie";

type MeEnvelope = {
  status?: boolean;
  message?: string;
  data?: unknown;
};

type MePayload = {
  is_root?: boolean;
  system_role?: string;
};

/**
 * Smart challenge list for the admin console.
 *
 * - With ?hackathon= / ?hackathonId= → event-scoped challenge-admin list
 * - Without hackathon + Root / system.admin → all platform challenges
 * - Without hackathon + other roles → 400 (must pick an event)
 *
 * GET /api/haas/challenge-list
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const hackathonId =
    url.searchParams.get("hackathonId")?.trim() ||
    url.searchParams.get("hackathon")?.trim() ||
    "";

  if (hackathonId) {
    // Preserve other query params (search, category, …) but drop our hackathon keys.
    const upstream = new URL(request.url);
    upstream.searchParams.delete("hackathonId");
    upstream.searchParams.delete("hackathon");

    const proxiedRequest = new Request(upstream.toString(), request);

    return forwardToDjango({
      request: proxiedRequest,
      backendPath: `haas/hackathons/${hackathonId}/challenge-admin/`,
      method: "GET",
    });
  }

  const accessToken = await getSessionToken();
  if (!accessToken) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { httpStatus, payload } = await callBackendJson<MeEnvelope>("haas/me/", {
      method: "GET",
      accessToken,
      clientIpAddress: getClientIpAddress(request),
    });

    if (httpStatus >= 400 || payload.status === false) {
      return errorResponse(
        payload.message ?? "Could not resolve current user role",
        httpStatus >= 400 ? httpStatus : 401,
      );
    }

    const me = decryptBackendPayload<MePayload>(payload.data);

    if (!isPlatformChallengeOperator(me)) {
      return errorResponse(
        "Hackathon ID is required. Only Root / system.admin can list all challenges without selecting a hackathon.",
        400,
      );
    }

    // All challenges across the platform (optional ?hackathon= still supported upstream).
    return forwardToDjango({
      request,
      backendPath: "haas/challenges/",
      method: "GET",
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to list challenges",
      502,
    );
  }
}
