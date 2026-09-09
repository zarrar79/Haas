import { haasGet, haasList, haasSend, toFormData } from "@/lib/haas-api";

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
  return haasList<Sponsor>("sponsors", {
    search: filters?.search,
    active: filters?.active,
    limit: filters?.limit ?? "200",
  });
}

export function getSponsor(id: string) {
  return haasGet<Sponsor>(`sponsors/${id}`);
}

export async function createSponsor(
  body: SponsorWriteInput & { name: string },
  options?: { file?: File | null },
) {
  if (!options?.file) {
    return haasSend<Sponsor>("sponsors", { method: "POST", body });
  }
  return haasSend<Sponsor>("sponsors", {
    method: "POST",
    body: toFormData(body, { file: options.file, fileField: "image" }),
  });
}

export async function updateSponsor(
  id: string,
  body: SponsorWriteInput,
  options?: { file?: File | null; clearImage?: boolean },
) {
  const needsMultipart = Boolean(options?.file || options?.clearImage);
  if (!needsMultipart) {
    return haasSend<Sponsor>(`sponsors/${id}`, { method: "PATCH", body });
  }
  return haasSend<Sponsor>(`sponsors/${id}`, {
    method: "PATCH",
    body: toFormData(body, {
      file: options?.file,
      fileField: "image",
      flags: { clear_image: options?.clearImage },
    }),
  });
}
