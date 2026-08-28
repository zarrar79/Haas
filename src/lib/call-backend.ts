import "server-only";

import { assertAllowedBackendPath } from "@/lib/allowed-backend-paths";
import { getServerConfig } from "@/lib/server-config";

export type CallBackendOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  accessToken?: string | null;
  clientIpAddress?: string | null;
};

function buildBackendUrl(path: string): string {
  const { backendBaseUrl } = getServerConfig();
  const base = backendBaseUrl.replace(/\/$/, "");
  const relativePath = path.replace(/^\//, "");
  return `${base}/${relativePath}`;
}

/**
 * Call the real Django backend from the BFF only.
 * Never import this into client components.
 * Only user/login/ and haas/* are allowed.
 */
export async function callBackend(
  path: string,
  options: CallBackendOptions = {},
): Promise<Response> {
  assertAllowedBackendPath(path);

  const {
    body,
    accessToken,
    clientIpAddress,
    headers: optionHeaders,
    ...requestInit
  } = options;

  const headers = new Headers(optionHeaders);
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  const isBinary =
    typeof ArrayBuffer !== "undefined" &&
    (body instanceof ArrayBuffer ||
      (typeof Blob !== "undefined" && body instanceof Blob) ||
      (typeof Uint8Array !== "undefined" && body instanceof Uint8Array));

  if (body !== undefined && !headers.has("Content-Type") && !isFormData) {
    if (!isBinary) {
      headers.set("Content-Type", "application/json");
    }
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (clientIpAddress) {
    headers.set("x-client-ip", clientIpAddress);
  }

  let encodedBody: BodyInit | undefined;
  if (body === undefined) {
    encodedBody = undefined;
  } else if (isFormData || isBinary || typeof body === "string") {
    encodedBody = body as BodyInit;
  } else {
    encodedBody = JSON.stringify(body);
  }

  return fetch(buildBackendUrl(path), {
    ...requestInit,
    headers,
    body: encodedBody,
    cache: "no-store",
  });
}

/** Same as callBackend, but parses JSON for you. */
export async function callBackendJson<T>(
  path: string,
  options?: CallBackendOptions,
): Promise<{ httpStatus: number; payload: T }> {
  const response = await callBackend(path, options);
  const payload = (await response.json()) as T;
  return { httpStatus: response.status, payload };
}
