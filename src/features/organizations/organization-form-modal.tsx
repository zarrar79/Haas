"use client";

import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { ModalShell } from "@/components/ui/modal-shell";
import { TextField } from "@/components/ui/text-field";
import {
  createOrganization,
  getOrganization,
  updateOrganization,
  type Organization,
} from "@/features/organizations/organization-api";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  organizationId?: string | null;
  onClose: () => void;
  onSaved: (org: Organization) => void;
};

export function OrganizationFormModal({
  open,
  mode,
  organizationId,
  onClose,
  onSaved,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [clearMedia, setClearMedia] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setImageFile(null);
    setClearMedia(false);
    if (mode === "create" || !organizationId) {
      setName("");
      setDescription("");
      setIsActive(true);
      setMediaUrl(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getOrganization(organizationId)
      .then((row) => {
        if (cancelled) return;
        setName(row.name || "");
        setDescription(row.description || "");
        setIsActive(row.is_active !== false);
        setMediaUrl(row.media_url || null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load organization",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, mode, organizationId]);

  async function submit() {
    if (!name.trim()) {
      setError("Organization name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        is_active: isActive,
      };
      const saved =
        mode === "edit" && organizationId
          ? await updateOrganization(organizationId, payload, {
              file: imageFile,
              clearMedia,
            })
          : await createOrganization(payload, { file: imageFile });
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      panelClassName="max-w-lg"
      ariaLabel={mode === "edit" ? "Edit organization" : "Create organization"}
    >
      <div className="border-b border-[var(--border)] px-5 py-4">
        <h2 className="text-lg font-bold text-[var(--text)]">
          {mode === "edit" ? "Edit organization" : "Create organization"}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Organizations can be assigned to hackathons later.
        </p>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading…</p>
        ) : (
          <>
            <ImageUploadField
              label="Organization image"
              currentUrl={mediaUrl}
              name={name}
              file={imageFile}
              clearRequested={clearMedia}
              onFileChange={setImageFile}
              onClearChange={setClearMedia}
              rounded="md"
            />
            <TextField
              label="Name"
              name="org_name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
              <span className="font-medium text-[var(--text)]">Description</span>
              <textarea
                className="min-h-[96px] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text)]">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active
            </label>
          </>
        )}
        {error ? <Alert variant="error">{error}</Alert> : null}
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={() => void submit()} disabled={busy || loading}>
          {busy
            ? "Saving…"
            : mode === "edit"
              ? "Save changes"
              : "Create organization"}
        </Button>
      </div>
    </ModalShell>
  );
}
