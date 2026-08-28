type BadgeProps = {
  tone?: "neutral" | "success" | "danger" | "warning";
  children: React.ReactNode;
};

export function Badge({ tone = "neutral", children }: BadgeProps) {
  const styles =
    tone === "success"
      ? "bg-[var(--accent-muted)] text-[var(--accent)]"
      : tone === "danger"
        ? "bg-[var(--danger-muted)] text-[var(--danger)]"
        : tone === "warning"
          ? "bg-[color-mix(in_srgb,var(--warning)_18%,transparent)] text-[var(--warning)]"
          : "bg-[var(--surface-raised)] text-[var(--text-muted)]";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}
    >
      {children}
    </span>
  );
}
