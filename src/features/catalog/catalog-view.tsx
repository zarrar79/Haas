"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StickyToolbar } from "@/components/ui/sticky-toolbar";
import { TextField } from "@/components/ui/text-field";
import {
  createCatalogItem,
  listCatalog,
  type CatalogItem,
  type CatalogKind,
} from "@/features/catalog/catalog-api";
import { ApiRequestError } from "@/lib/client-api";

const KINDS: { id: CatalogKind; label: string }[] = [
  { id: "challenge-types", label: "Challenge types" },
  { id: "difficulties", label: "Difficulties" },
  { id: "categories", label: "Categories" },
  { id: "sources", label: "Sources" },
  { id: "hints", label: "Hints" },
  { id: "skills", label: "Skills" },
  { id: "techniques", label: "Techniques" },
];

export function CatalogView() {
  const router = useRouter();
  const [kind, setKind] = useState<CatalogKind>("categories");
  const [rows, setRows] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setRows(await listCatalog(kind));
    } catch (err) {
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load catalog");
    } finally {
      setIsLoading(false);
    }
  }, [kind, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate() {
    if (!name.trim()) return;
    setError(null);
    try {
      await createCatalogItem(kind, {
        name: name.trim(),
        description: description.trim(),
      });
      setName("");
      setDescription("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed (platform write only)");
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Platform"
        title="Catalog"
        description="Global challenge types, difficulties, categories, sources, and hints."
        actions={
          <Button variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      <StickyToolbar layout="stack">
        <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <Button
            key={k.id}
            size="sm"
            variant={kind === k.id ? "primary" : "secondary"}
            onClick={() => setKind(k.id)}
          >
            {k.label}
          </Button>
        ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
        <TextField
          label="Name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex items-end">
          <Button className="w-full" onClick={() => void onCreate()}>
            Create (Root / system.admin)
          </Button>
        </div>
        </div>
      </StickyToolbar>

      {error ? (
        <div className="mb-3">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      <DataTable
        isLoading={isLoading}
        rows={rows}
        rowKey={(r) => r.id}
        emptyMessage="No catalog items."
        columns={[
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
            key: "id",
            header: "ID",
            render: (r) => (
              <span className="font-mono text-[10px] text-[var(--text-muted)]">
                {r.id}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
