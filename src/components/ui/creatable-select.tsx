"use client";

import { FORM_CONTROL_CLASS } from "@/components/ui/form-control";

type CreatableSelectProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  hint?: string;
};

/**
 * Select an existing option or type a new one (HTML datalist).
 * Matches Google Sheet-style dropdowns that still allow free text.
 */
export function CreatableSelect({
  label,
  name,
  value,
  onChange,
  options,
  disabled = false,
  placeholder,
  required = false,
  hint,
}: CreatableSelectProps) {
  const listId = `${name}-creatable-options`;
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-[var(--text)]">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        className={FORM_CONTROL_CLASS}
        list={listId}
        name={name}
        value={value}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
      <datalist id={listId}>
        {options.map((opt) => (
          <option key={opt} value={opt} />
        ))}
      </datalist>
      {hint ? (
        <span className="mt-1 block text-xs text-[var(--text-muted)]">{hint}</span>
      ) : null}
    </label>
  );
}
