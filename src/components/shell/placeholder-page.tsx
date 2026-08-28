type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="w-full">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        Coming next
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text)]">
        {title}
      </h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p>
    </div>
  );
}
