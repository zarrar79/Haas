import { callAppApi } from "@/lib/client-api";
import {
  asList,
  haasApiPath,
  unwrapHaasResult,
  type HaasForwardPayload,
} from "@/lib/haas-api";
import type { ApiResult } from "@/types";

export type Organization = {
  id: string;
  name: string;
  description?: string | null;
  media?: string | null;
  media_url?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type OrganizationWriteInput = {
  name?: string;
  description?: string;
  is_active?: boolean;
};

export async function listOrganizations(filters?: {
  search?: string;
  is_active?: string;
  limit?: string;
}) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath("organizations", {
      search: filters?.search,
      is_active: filters?.is_active,
      limit: filters?.limit ?? "200",
    }),
  );
  return asList<Organization>(unwrapHaasResult(result).data);
}

export async function getOrganization(id: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<Organization>>>(
    haasApiPath(`organizations/${id}`),
  );
  return unwrapHaasResult(result).data;
}

export async function createOrganization(
  body: OrganizationWriteInput & { name: string },
  options?: { file?: File | null },
) {
  if (!options?.file) {
    const result = await callAppApi<ApiResult<HaasForwardPayload<Organization>>>(
      haasApiPath("organizations"),
      { method: "POST", body },
    );
    return unwrapHaasResult(result).data;
  }
  const form = new FormData();
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue;
    form.append(key, String(value));
  }
  form.append("file", options.file);
  const result = await callAppApi<ApiResult<HaasForwardPayload<Organization>>>(
    haasApiPath("organizations"),
    { method: "POST", body: form },
  );
  return unwrapHaasResult(result).data;
}

export async function updateOrganization(
  id: string,
  body: OrganizationWriteInput,
  options?: { file?: File | null; clearMedia?: boolean },
) {
  const needsMultipart = Boolean(options?.file || options?.clearMedia);
  if (!needsMultipart) {
    const result = await callAppApi<ApiResult<HaasForwardPayload<Organization>>>(
      haasApiPath(`organizations/${id}`),
      { method: "PATCH", body },
    );
    return unwrapHaasResult(result).data;
  }
  const form = new FormData();
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue;
    form.append(key, String(value));
  }
  if (options?.file) form.append("file", options.file);
  if (options?.clearMedia) form.append("clear_media", "true");
  const result = await callAppApi<ApiResult<HaasForwardPayload<Organization>>>(
    haasApiPath(`organizations/${id}`),
    { method: "PATCH", body: form },
  );
  return unwrapHaasResult(result).data;
}
