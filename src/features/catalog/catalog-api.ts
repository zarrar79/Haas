import { callAppApi } from "@/lib/client-api";
import {
  asList,
  haasApiPath,
  unwrapHaasResult,
  type HaasForwardPayload,
} from "@/lib/haas-api";
import type { ApiResult } from "@/types";

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

export async function listCatalog(
  kind: CatalogKind,
  filters?: { search?: string; skill?: string },
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`catalog/${kind}`, {
      limit: "100",
      search: filters?.search,
      skill: filters?.skill,
    }),
  );
  return asList<CatalogItem>(unwrapHaasResult(result).data);
}

export async function createCatalogItem(
  kind: CatalogKind,
  body: Record<string, unknown>,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<CatalogItem>>>(
    haasApiPath(`catalog/${kind}`),
    { method: "POST", body },
  );
  return unwrapHaasResult(result).data;
}

export async function updateCatalogItem(
  kind: CatalogKind,
  id: string,
  body: Record<string, unknown>,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<CatalogItem>>>(
    haasApiPath(`catalog/${kind}/${id}`),
    { method: "PATCH", body },
  );
  return unwrapHaasResult(result).data;
}
