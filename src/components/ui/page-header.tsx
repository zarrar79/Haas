type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-[var(--text)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
