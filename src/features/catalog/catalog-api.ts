import { haasList, haasSend } from "@/lib/haas-api";

export type CatalogItem = {
  id: string;
  name?: string;
  description?: string;
  source_type?: string;
  text?: string;
  score_limit?: number;
  is_visible?: boolean;
  is_active?: boolean;
  parent_tag?: string | null;
  parent_tag_name?: string | null;
  [key: string]: unknown;
};

export type CatalogKind =
  | "challenge-types"
  | "difficulties"
  | "categories"
  | "sources"
  | "hints"
  | "skills"
  | "techniques";

export function listCatalog(
  kind: CatalogKind,
  filters?: { search?: string; skill?: string },
) {
  return haasList<CatalogItem>(`catalog/${kind}`, {
    limit: "100",
    search: filters?.search,
    skill: filters?.skill,
  });
}

export function createCatalogItem(kind: CatalogKind, body: Record<string, unknown>) {
  return haasSend<CatalogItem>(`catalog/${kind}`, { method: "POST", body });
}

export function updateCatalogItem(
  kind: CatalogKind,
  id: string,
  body: Record<string, unknown>,
) {
  return haasSend<CatalogItem>(`catalog/${kind}/${id}`, {
    method: "PATCH",
    body,
  });
}
