import { forwardToDjango } from "@/lib/forward-to-django";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

/**
 * Catch-all HaaS BFF proxy.
 * Browser:  /api/haas/<any/path>
 * Django:   /haas/<any/path>/
 *
 * Covers every endpoint under cyberrange/src/apps/haas/urls.py
 */
async function proxyHaasRequest(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const joined = path.join("/");
  const backendPath = `haas/${joined}/`;

  return forwardToDjango({
    request,
    backendPath,
    method: request.method,
  });
}

export const GET = proxyHaasRequest;
export const POST = proxyHaasRequest;
export const PATCH = proxyHaasRequest;
export const PUT = proxyHaasRequest;
export const DELETE = proxyHaasRequest;
