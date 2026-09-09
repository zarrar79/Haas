type RemovableChipProps = {
  label: string;
  onRemove: () => void;
  disabled?: boolean;
  removeAriaLabel?: string;
};

export function RemovableChip({
  label,
  onRemove,
  disabled = false,
  removeAriaLabel,
}: RemovableChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--text)]">
      {label}
      <button
        type="button"
        className="text-[var(--text-muted)] hover:text-[var(--danger)]"
        disabled={disabled}
        onClick={onRemove}
        aria-label={removeAriaLabel ?? `Remove ${label}`}
      >
        ×
      </button>
    </span>
  );
}
