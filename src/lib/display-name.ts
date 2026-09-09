export type NamedPerson = {
  full_name?: string | null;
  name?: string | null;
  last_name?: string | null;
  username?: string | null;
  email?: string | null;
};

export function formatPersonName(
  person?: NamedPerson | null,
  fallback = "",
): string {
  if (!person) return fallback;
  return (
    person.full_name?.trim() ||
    [person.name, person.last_name].filter(Boolean).join(" ").trim() ||
    person.username ||
    person.email ||
    fallback
  );
}

export function personInitial(name?: string | null): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

export function personFirstName(name?: string | null, fallback = "Account"): string {
  const trimmed = name?.trim();
  if (!trimmed) return fallback;
  return trimmed.split(/\s+/)[0] ?? fallback;
}

export function hackathonLabel(
  hackathon?: {
    display_name?: string | null;
    name?: string | null;
    id?: string;
  } | null,
  fallback = "",
): string {
  if (!hackathon) return fallback;
  return (
    hackathon.display_name?.trim() ||
    hackathon.name?.trim() ||
    hackathon.id ||
    fallback
  );
}
