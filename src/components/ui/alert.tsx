type AlertProps = {
  variant?: "error" | "success" | "info";
  children: React.ReactNode;
};

export function Alert({ variant = "info", children }: AlertProps) {
  const styles =
    variant === "error"
      ? "border-[var(--danger)]/40 bg-[var(--danger-muted)] text-[var(--danger)]"
      : variant === "success"
        ? "border-[var(--accent)]/40 bg-[var(--accent-muted)] text-[var(--accent)]"
        : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)]";

  return (
    <div
      className={`rounded-[var(--radius-sm)] border px-3 py-2 text-sm ${styles}`}
    >
      {children}
    </div>
  );
}
