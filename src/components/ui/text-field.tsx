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
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-semibold text-[var(--text)]">{label}</span>
      <input
        id={fieldId}
        className={`rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--input-bg)] px-3.5 py-2.5 font-medium text-[var(--text)] shadow-[var(--shadow-sm)] outline-none placeholder:text-[var(--text-subtle)] focus:border-[var(--accent)]/40 focus:shadow-md disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        {...props}
      />
      {errorMessage ? (
        <span className="text-xs font-medium text-[var(--danger)]">
          {errorMessage}
        </span>
      ) : null}
    </label>
  );
}
