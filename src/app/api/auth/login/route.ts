import { z } from "zod";

import { errorResponse, successResponse } from "@/lib/bff-response";
import { callBackendJson } from "@/lib/call-backend";
import { decryptBackendPayload } from "@/lib/decrypt-backend-payload";
import { encryptLoginCredentials } from "@/lib/encrypt-login-credentials";
import { getClientIpAddress } from "@/lib/request-helpers";
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/session-cookie";

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type LoginBackendEnvelope = {
  status?: boolean;
  message?: string;
  code?: number | string;
  data?: unknown;
};

type LoginData = {
  token?: string;
  access?: string;
  refresh?: string;
  user?: unknown;
};

/**
 * POST /api/auth/login
 * Browser sends plain email/password → BFF encrypts → Django /user/login/
 */
export async function POST(request: Request) {
  try {
    const json: unknown = await request.json();
    const credentials = loginBodySchema.parse(json);

    const encryptedPayload = encryptLoginCredentials(credentials);

    const { httpStatus, payload } = await callBackendJson<LoginBackendEnvelope>(
      "user/login/",
      {
        method: "POST",
        body: { payload: encryptedPayload },
        clientIpAddress: getClientIpAddress(request),
      },
    );

    if (httpStatus >= 400 || payload.status === false) {
      return errorResponse(
        payload.message ?? "Login failed",
        httpStatus >= 400 ? httpStatus : 401,
        payload.code !== undefined ? String(payload.code) : undefined,
      );
    }

    const loginData = decryptBackendPayload<LoginData>(payload.data);
    const accessToken = loginData?.token ?? loginData?.access;
    const loginUser = loginData?.user as { is_staff?: boolean } | null | undefined;

    if (loginUser && loginUser.is_staff !== true) {
      return errorResponse(
        "You do not have administrative privileges to access this console.",
        403,
      );
    }

    if (!accessToken) {
      return errorResponse(
        "Login succeeded but no access token was returned.",
        502,
      );
    }

    const response = successResponse({
      user: loginData.user ?? null,
      message: payload.message ?? "Logged in",
    });

    response.cookies.set(
      SESSION_COOKIE_NAME,
      accessToken,
      getSessionCookieOptions(),
    );

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse("Invalid login body. Expected email and password.", 400);
    }

    return errorResponse(
      error instanceof Error ? error.message : "Login error",
      500,
    );
  }
}
