"use client";

import { useState } from "react";

import { ImageUploadField } from "@/components/ui/image-upload-field";
import { TextField } from "@/components/ui/text-field";

export type PendingOrganization = {
  name: string;
  description: string;
  file: File | null;
};

type Props = {
  value: PendingOrganization;
  onChange: (next: PendingOrganization) => void;
  disabled?: boolean;
};

/** Create-time organization (attached after the hackathon exists). */
export function PendingOrganizationFields({
  value,
  onChange,
  disabled = false,
}: Props) {
  const [clearMedia, setClearMedia] = useState(false);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-[var(--text)]">
          Primary organization
        </p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          Optional. Created with this event and set as the primary organization.
        </p>
      </div>
      <ImageUploadField
        label="Organization image"
        currentUrl={null}
        name={value.name}
        file={value.file}
        clearRequested={clearMedia}
        onFileChange={(file) => {
          setClearMedia(false);
          onChange({ ...value, file });
        }}
        onClearChange={(clear) => {
          setClearMedia(clear);
          if (clear) onChange({ ...value, file: null });
        }}
        rounded="md"
      />
      <TextField
        label="Organization name"
        name="org_name"
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        placeholder="e.g. Cyber Corps"
        disabled={disabled}
      />
      <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
        <span className="font-medium text-[var(--text)]">Description</span>
        <textarea
          className="min-h-[80px] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] disabled:opacity-60"
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          disabled={disabled}
          placeholder="Optional"
        />
      </label>
    </div>
  );
}
