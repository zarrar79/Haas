import type { ReactNode } from "react";

import type { CatalogItem, CatalogKind } from "@/features/catalog/catalog-api";

type CatalogColumn = {
  key: string;
  header: string;
  render: (row: CatalogItem) => ReactNode;
};

export type CatalogFieldKind = "text" | "textarea" | "number" | "skill" | "checkbox";

export type CatalogFieldDef = {
  key: string;
  label: string;
  kind: CatalogFieldKind;
  required?: boolean;
  placeholder?: string;
};

export type CatalogKindMeta = {
  id: CatalogKind;
  label: string;
  singular: string;
  createTitle: string;
  searchTitle: string;
  createSubmitLabel: string;
  fields: CatalogFieldDef[];
  supportsSkillFilter: boolean;
  buildPayload: (values: Record<string, string | boolean>) => Record<string, unknown>;
  columns: CatalogColumn[];
};

function idColumn(): CatalogColumn {
  return {
    key: "id",
    header: "ID",
    render: (r) => (
      <span className="font-mono text-[10px] text-[var(--text-muted)]">{r.id}</span>
    ),
  };
}

export const CATALOG_KINDS: { id: CatalogKind; label: string }[] = [
  { id: "challenge-types", label: "Challenge types" },
  { id: "difficulties", label: "Difficulties" },
  { id: "categories", label: "Categories" },
  { id: "sources", label: "Sources" },
  { id: "hints", label: "Hints" },
  { id: "skills", label: "Skills" },
  { id: "techniques", label: "Techniques" },
];

const CONFIG: Record<CatalogKind, CatalogKindMeta> = {
  "challenge-types": {
    id: "challenge-types",
    label: "Challenge types",
    singular: "challenge type",
    createTitle: "Create challenge type",
    searchTitle: "Search challenge types",
    createSubmitLabel: "Create (Root / system.admin)",
    supportsSkillFilter: false,
    fields: [
      { key: "name", label: "Name", kind: "text", required: true, placeholder: "e.g. CTF" },
      {
        key: "description",
        label: "Description",
        kind: "textarea",
        placeholder: "Optional description",
      },
    ],
    buildPayload: (values) => ({
      name: String(values.name ?? "").trim(),
      description: String(values.description ?? "").trim(),
    }),
    columns: [
      {
        key: "name",
        header: "Name",
        render: (r) => r.name || r.id,
      },
      {
        key: "desc",
        header: "Description",
        render: (r) => String(r.description ?? "—"),
      },
      idColumn(),
    ],
  },
  difficulties: {
    id: "difficulties",
    label: "Difficulties",
    singular: "difficulty",
    createTitle: "Create difficulty",
    searchTitle: "Search difficulties",
    createSubmitLabel: "Create (Root / system.admin)",
    supportsSkillFilter: false,
    fields: [
      { key: "name", label: "Name", kind: "text", required: true, placeholder: "e.g. Easy" },
      {
        key: "description",
        label: "Description",
        kind: "textarea",
        placeholder: "Optional description",
      },
      {
        key: "score_limit",
        label: "Score limit",
        kind: "number",
        placeholder: "0",
      },
    ],
    buildPayload: (values) => ({
      name: String(values.name ?? "").trim(),
      description: String(values.description ?? "").trim(),
      score_limit: Number(values.score_limit) || 0,
    }),
    columns: [
      {
        key: "name",
        header: "Name",
        render: (r) => r.name || r.id,
      },
      {
        key: "desc",
        header: "Description",
        render: (r) => String(r.description ?? "—"),
      },
      {
        key: "score_limit",
        header: "Score limit",
        render: (r) => String(r.score_limit ?? "—"),
      },
      idColumn(),
    ],
  },
  categories: {
    id: "categories",
    label: "Categories",
    singular: "category",
    createTitle: "Create category",
    searchTitle: "Search categories",
    createSubmitLabel: "Create (Root / system.admin)",
    supportsSkillFilter: false,
    fields: [
      { key: "name", label: "Name", kind: "text", required: true, placeholder: "e.g. Web" },
      {
        key: "description",
        label: "Description",
        kind: "textarea",
        placeholder: "Optional description",
      },
    ],
    buildPayload: (values) => ({
      name: String(values.name ?? "").trim(),
      description: String(values.description ?? "").trim(),
    }),
    columns: [
      {
        key: "name",
        header: "Name",
        render: (r) => r.name || r.id,
      },
      {
        key: "desc",
        header: "Description",
        render: (r) => String(r.description ?? "—"),
      },
      idColumn(),
    ],
  },
  sources: {
    id: "sources",
    label: "Sources",
    singular: "source",
    createTitle: "Create source",
    searchTitle: "Search sources",
    createSubmitLabel: "Create (Root / system.admin)",
    supportsSkillFilter: false,
    fields: [
      {
        key: "source_type",
        label: "Source type",
        kind: "text",
        required: true,
        placeholder: "e.g. internal",
      },
      {
        key: "description",
        label: "Description",
        kind: "textarea",
        placeholder: "Optional description",
      },
    ],
    buildPayload: (values) => ({
      source_type: String(values.source_type ?? "").trim(),
      description: String(values.description ?? "").trim(),
    }),
    columns: [
      {
        key: "source_type",
        header: "Source type",
        render: (r) => String(r.source_type ?? r.name ?? r.id),
      },
      {
        key: "desc",
        header: "Description",
        render: (r) => String(r.description ?? "—"),
      },
      idColumn(),
    ],
  },
  hints: {
    id: "hints",
    label: "Hints",
    singular: "hint",
    createTitle: "Create hint",
    searchTitle: "Search hints",
    createSubmitLabel: "Create (Root / system.admin)",
    supportsSkillFilter: false,
    fields: [
      {
        key: "text",
        label: "Hint text",
        kind: "textarea",
        required: true,
        placeholder: "Hint content shown to participants",
      },
      { key: "is_visible", label: "Visible to participants", kind: "checkbox" },
    ],
    buildPayload: (values) => ({
      text: String(values.text ?? "").trim(),
      is_visible: Boolean(values.is_visible),
    }),
    columns: [
      {
        key: "text",
        header: "Text",
        render: (r) => String(r.text ?? r.name ?? "—"),
      },
      {
        key: "is_visible",
        header: "Visible",
        render: (r) => (r.is_visible ? "Yes" : "No"),
      },
      idColumn(),
    ],
  },
  skills: {
    id: "skills",
    label: "Skills",
    singular: "skill",
    createTitle: "Create skill",
    searchTitle: "Search skills",
    createSubmitLabel: "Create (Root / system.admin)",
    supportsSkillFilter: false,
    fields: [
      {
        key: "name",
        label: "Name",
        kind: "text",
        required: true,
        placeholder: "e.g. Web Exploitation",
      },
      {
        key: "description",
        label: "Description",
        kind: "textarea",
        placeholder: "Optional description",
      },
    ],
    buildPayload: (values) => ({
      name: String(values.name ?? "").trim(),
      description: String(values.description ?? "").trim(),
    }),
    columns: [
      {
        key: "name",
        header: "Name",
        render: (r) => r.name || r.id,
      },
      {
        key: "desc",
        header: "Description",
        render: (r) => String(r.description ?? "—"),
      },
      idColumn(),
    ],
  },
  techniques: {
    id: "techniques",
    label: "Techniques",
    singular: "technique",
    createTitle: "Create technique",
    searchTitle: "Search techniques",
    createSubmitLabel: "Create (Root / system.admin)",
    supportsSkillFilter: true,
    fields: [
      {
        key: "parent_tag",
        label: "Skill",
        kind: "skill",
        required: true,
      },
      {
        key: "name",
        label: "Name",
        kind: "text",
        required: true,
        placeholder: "e.g. SQL injection",
      },
      {
        key: "description",
        label: "Description",
        kind: "textarea",
        placeholder: "Optional description",
      },
    ],
    buildPayload: (values) => ({
      parent_tag: String(values.parent_tag ?? "").trim(),
      name: String(values.name ?? "").trim(),
      description: String(values.description ?? "").trim(),
    }),
    columns: [
      {
        key: "name",
        header: "Name",
        render: (r) => r.name || r.id,
      },
      {
        key: "skill",
        header: "Skill",
        render: (r) => String(r.parent_tag_name ?? "—"),
      },
      {
        key: "desc",
        header: "Description",
        render: (r) => String(r.description ?? "—"),
      },
      idColumn(),
    ],
  },
};

export function getCatalogKindConfig(kind: CatalogKind): CatalogKindMeta {
  return CONFIG[kind];
}

export function emptyCatalogFormValues(kind: CatalogKind): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {};
  for (const field of CONFIG[kind].fields) {
    values[field.key] = field.kind === "checkbox" ? false : "";
  }
  return values;
}
