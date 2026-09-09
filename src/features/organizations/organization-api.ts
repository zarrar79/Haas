import { haasGet, haasList, haasSend, toFormData } from "@/lib/haas-api";

export type Organization = {
  id: string;
  hackathon?: string | null;
  name: string;
  description?: string | null;
  media?: string | null;
  media_url?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type OrganizationWriteInput = {
  hackathon?: string;
  name?: string;
  description?: string;
  is_active?: boolean;
};

export async function listOrganizations(filters?: {
  hackathon?: string;
  search?: string;
  is_active?: string;
  limit?: string;
}) {
  return haasList<Organization>("organizations", {
    hackathon: filters?.hackathon,
    search: filters?.search,
    is_active: filters?.is_active,
    limit: filters?.limit ?? "200",
  });
}

export function getOrganization(id: string) {
  return haasGet<Organization>(`organizations/${id}`);
}

export async function createOrganization(
  body: OrganizationWriteInput & { name: string; hackathon: string },
  options?: { file?: File | null },
) {
  if (!options?.file) {
    return haasSend<Organization>("organizations", { method: "POST", body });
  }
  return haasSend<Organization>("organizations", {
    method: "POST",
    body: toFormData(body, { file: options.file }),
  });
}

export async function updateOrganization(
  id: string,
  body: OrganizationWriteInput,
  options?: { file?: File | null; clearMedia?: boolean },
) {
  const needsMultipart = Boolean(options?.file || options?.clearMedia);
  if (!needsMultipart) {
    return haasSend<Organization>(`organizations/${id}`, {
      method: "PATCH",
      body,
    });
  }
  return haasSend<Organization>(`organizations/${id}`, {
    method: "PATCH",
    body: toFormData(body, {
      file: options?.file,
      flags: { clear_media: options?.clearMedia },
    }),
  });
}
