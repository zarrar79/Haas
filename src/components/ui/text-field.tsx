import type { InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  errorMessage?: string;
};

export function TextField({
  label,
  id,
  errorMessage,
  className = "",
  ...props
}: TextFieldProps) {
  const fieldId = id ?? props.name;

  return (
    <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
      <span className="font-medium text-[var(--text)]">{label}</span>
      <input
        id={fieldId}
        className={`rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[var(--focus-ring)] ${className}`}
        {...props}
      />
      {errorMessage ? (
        <span className="text-xs text-[var(--danger)]">{errorMessage}</span>
      ) : null}
    </label>
  );
}
