import { errorResponse } from "@/lib/bff-response";
import { forwardToDjango } from "@/lib/forward-to-django";
import { getSessionToken } from "@/lib/session-cookie";

/**
 * Smart challenge list for the admin console.
 *
 * - With ?hackathon= / ?hackathonId= → event-scoped challenge-admin list
 * - Without hackathon → platform list (Root sees all; hackathon admins see their events)
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

  return forwardToDjango({
    request,
    backendPath: "haas/challenges/",
    method: "GET",
  });
}
