"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormCheckbox, FormSelect, FormTextarea } from "@/components/ui/form-fields";
import { ModalShell } from "@/components/ui/modal-shell";
import { TextField } from "@/components/ui/text-field";
import {
  createCatalogItem,
  listCatalog,
  type CatalogItem,
  type CatalogKind,
} from "@/features/catalog/catalog-api";
import {
  emptyCatalogFormValues,
  getCatalogKindConfig,
  type CatalogFieldDef,
} from "@/features/catalog/catalog-kind-config";

type Props = {
  open: boolean;
  kind: CatalogKind;
  onClose: () => void;
  onCreated: () => void;
};

function CatalogField({
  field,
  value,
  onChange,
  skills,
  skillsLoading,
}: {
  field: CatalogFieldDef;
  value: string | boolean;
  onChange: (value: string | boolean) => void;
  skills: CatalogItem[];
  skillsLoading: boolean;
}) {
  if (field.kind === "checkbox") {
    return (
      <FormCheckbox
        label={field.label}
        checked={Boolean(value)}
        onChange={(checked) => onChange(checked)}
      />
    );
  }

  if (field.kind === "skill") {
    return (
      <FormSelect
        label={field.label}
        required={field.required}
        value={String(value)}
        disabled={skillsLoading}
        onChange={onChange}
      >
        <option value="">
          {skillsLoading ? "Loading skills…" : "Select skill…"}
        </option>
        {skills.map((skill) => (
          <option key={skill.id} value={skill.id}>
            {skill.name || skill.id}
          </option>
        ))}
      </FormSelect>
    );
  }

  if (field.kind === "textarea") {
    return (
      <FormTextarea
        label={field.label}
        required={field.required}
        controlClassName="min-h-[96px] resize-y"
        value={String(value)}
        placeholder={field.placeholder}
        onChange={onChange}
      />
    );
  }

  if (field.kind === "number") {
    return (
      <TextField
        label={field.label}
        name={field.key}
        type="number"
        required={field.required}
        placeholder={field.placeholder}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <TextField
      label={field.label}
      name={field.key}
      required={field.required}
      placeholder={field.placeholder}
      value={String(value)}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function CatalogCreateModal({ open, kind, onClose, onCreated }: Props) {
  const config = getCatalogKindConfig(kind);
  const needsSkills = config.fields.some((field) => field.kind === "skill");

  const [values, setValues] = useState<Record<string, string | boolean>>(() =>
    emptyCatalogFormValues(kind),
  );
  const [skills, setSkills] = useState<CatalogItem[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSkills = useCallback(async () => {
    if (!needsSkills) return;
    setSkillsLoading(true);
    try {
      setSkills(await listCatalog("skills"));
    } catch {
      setSkills([]);
    } finally {
      setSkillsLoading(false);
    }
  }, [needsSkills]);

  useEffect(() => {
    if (!open) return;
    setValues(emptyCatalogFormValues(kind));
    setError(null);
    void loadSkills();
  }, [open, kind, loadSkills]);

  function setField(key: string, value: string | boolean) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    for (const field of config.fields) {
      if (!field.required) continue;
      const value = values[field.key];
      if (field.kind === "checkbox") continue;
      if (!String(value ?? "").trim()) {
        setError(`${field.label} is required.`);
        return;
      }
    }

    setBusy(true);
    setError(null);
    try {
      await createCatalogItem(kind, config.buildPayload(values));
      onCreated();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Create failed (platform write only)",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      panelClassName="max-w-lg"
      ariaLabel={config.createTitle}
    >
      <div className="border-b border-[var(--border)] px-5 py-4">
        <h2 className="text-lg font-bold text-[var(--text)]">{config.createTitle}</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Add a new {config.singular} to the platform catalog.
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {config.fields.map((field) => (
          <CatalogField
            key={field.key}
            field={field}
            value={values[field.key] ?? (field.kind === "checkbox" ? false : "")}
            onChange={(value) => setField(field.key, value)}
            skills={skills}
            skillsLoading={skillsLoading}
          />
        ))}

        {error ? <Alert variant="error">{error}</Alert> : null}
      </div>

      <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={() => void submit()} disabled={busy}>
          {busy ? "Creating…" : config.createSubmitLabel}
        </Button>
      </div>
    </ModalShell>
  );
}
