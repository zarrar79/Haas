"use client";

import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { ModalShell } from "@/components/ui/modal-shell";
import { TextField } from "@/components/ui/text-field";
import {
  createSponsor,
  getSponsor,
  updateSponsor,
  type Sponsor,
} from "@/features/sponsors/sponsor-api";

const TAG_OPTIONS = [
  { value: "gold", label: "Gold" },
  { value: "silver", label: "Silver" },
  { value: "bronze", label: "Bronze" },
  { value: "partner", label: "Partner" },
];

const ORG_OPTIONS = [
  { value: "army", label: "Army" },
  { value: "country", label: "Country" },
  { value: "organization", label: "Organization" },
];

const INPUT_CLASS =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  sponsorId?: string | null;
  onClose: () => void;
  onSaved: (sponsor: Sponsor) => void;
};

export function SponsorFormModal({
  open,
  mode,
  sponsorId,
  onClose,
  onSaved,
}: Props) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("partner");
  const [orgType, setOrgType] = useState("organization");
  const [active, setActive] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [clearImage, setClearImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setImageFile(null);
    setClearImage(false);
    if (mode === "create" || !sponsorId) {
      setName("");
      setTag("partner");
      setOrgType("organization");
      setActive(true);
      setImageUrl(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getSponsor(sponsorId)
      .then((row) => {
        if (cancelled) return;
        setName(row.name || "");
        setTag(row.tag || "partner");
        setOrgType(row.organization_type || "organization");
        setActive(row.active !== false);
        setImageUrl(row.image_url || null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load sponsor");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, mode, sponsorId]);

  async function submit() {
    if (!name.trim()) {
      setError("Sponsor name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        tag,
        organization_type: orgType,
        active,
      };
      const saved =
        mode === "edit" && sponsorId
          ? await updateSponsor(sponsorId, payload, {
              file: imageFile,
              clearImage,
            })
          : await createSponsor(payload, { file: imageFile });
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
      ariaLabel={mode === "edit" ? "Edit sponsor" : "Create sponsor"}
    >
      <div className="border-b border-[var(--border)] px-5 py-4">
        <h2 className="text-lg font-bold text-[var(--text)]">
          {mode === "edit" ? "Edit sponsor" : "Create sponsor"}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Sponsors can be attached to hackathons later.
        </p>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading…</p>
        ) : (
          <>
            <ImageUploadField
              label="Sponsor image"
              currentUrl={imageUrl}
              name={name}
              file={imageFile}
              clearRequested={clearImage}
              onFileChange={setImageFile}
              onClearChange={setClearImage}
              rounded="md"
            />
            <TextField
              label="Name"
              name="sponsor_name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
              <span className="font-medium text-[var(--text)]">Tier</span>
              <select
                className={INPUT_CLASS}
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              >
                {TAG_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
              <span className="font-medium text-[var(--text)]">Organization type</span>
              <select
                className={INPUT_CLASS}
                value={orgType}
                onChange={(e) => setOrgType(e.target.value)}
              >
                {ORG_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text)]">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
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
          {busy ? "Saving…" : mode === "edit" ? "Save changes" : "Create sponsor"}
        </Button>
      </div>
    </ModalShell>
  );
}
