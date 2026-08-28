import { errorResponse, successResponse } from "@/lib/bff-response";
import {
  getClearedSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/session-cookie";

/** POST /api/auth/logout — clear the HttpOnly session cookie. */
export async function POST() {
  const response = successResponse({ loggedOut: true });
  response.cookies.set(
    SESSION_COOKIE_NAME,
    "",
    getClearedSessionCookieOptions(),
  );
  return response;
}

export async function GET() {
  return errorResponse("Use POST /api/auth/logout", 405);
}
