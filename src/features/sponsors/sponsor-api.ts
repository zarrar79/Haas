import { callAppApi } from "@/lib/client-api";
import {
  asList,
  haasApiPath,
  unwrapHaasResult,
  type HaasForwardPayload,
} from "@/lib/haas-api";
import type { ApiResult } from "@/types";

export type Sponsor = {
  id: string;
  name: string;
  tag?: string;
  organization_type?: string;
  active?: boolean;
  is_default?: boolean;
  image_url?: string | null;
};

export type SponsorWriteInput = {
  name?: string;
  tag?: string;
  organization_type?: string;
  active?: boolean;
};

export async function listSponsors(filters?: {
  search?: string;
  active?: string;
  limit?: string;
}) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath("sponsors", {
      search: filters?.search,
      active: filters?.active,
      limit: filters?.limit ?? "200",
    }),
  );
  return asList<Sponsor>(unwrapHaasResult(result).data);
}

export async function getSponsor(id: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<Sponsor>>>(
    haasApiPath(`sponsors/${id}`),
  );
  return unwrapHaasResult(result).data;
}

export async function createSponsor(
  body: SponsorWriteInput & { name: string },
  options?: { file?: File | null },
) {
  if (!options?.file) {
    const result = await callAppApi<ApiResult<HaasForwardPayload<Sponsor>>>(
      haasApiPath("sponsors"),
      { method: "POST", body },
    );
    return unwrapHaasResult(result).data;
  }
  const form = new FormData();
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue;
    form.append(key, String(value));
  }
  form.append("image", options.file);
  const result = await callAppApi<ApiResult<HaasForwardPayload<Sponsor>>>(
    haasApiPath("sponsors"),
    { method: "POST", body: form },
  );
  return unwrapHaasResult(result).data;
}

export async function updateSponsor(
  id: string,
  body: SponsorWriteInput,
  options?: { file?: File | null; clearImage?: boolean },
) {
  const needsMultipart = Boolean(options?.file || options?.clearImage);
  if (!needsMultipart) {
    const result = await callAppApi<ApiResult<HaasForwardPayload<Sponsor>>>(
      haasApiPath(`sponsors/${id}`),
      { method: "PATCH", body },
    );
    return unwrapHaasResult(result).data;
  }
  const form = new FormData();
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue;
    form.append(key, String(value));
  }
  if (options?.file) form.append("image", options.file);
  if (options?.clearImage) form.append("clear_image", "true");
  const result = await callAppApi<ApiResult<HaasForwardPayload<Sponsor>>>(
    haasApiPath(`sponsors/${id}`),
    { method: "PATCH", body: form },
  );
  return unwrapHaasResult(result).data;
}
