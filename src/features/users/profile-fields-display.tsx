import type { ReactNode } from "react";
import { BiAward, BiBook, BiChip } from "react-icons/bi";

export type EducationEntry = {
  level?: string;
  degree?: string;
  schoolName?: string;
  university?: string;
  sessionStart?: string | number;
  sessionEnd?: string | number;
};

export type ExpertiseEntry = {
  category?: string;
  level?: string;
  techStack?: string[];
};

function parseValue(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return value;
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

function toRecordArray(value: unknown): Record<string, unknown>[] {
  const parsed = parseValue(value);
  if (Array.isArray(parsed)) {
    return parsed.filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    );
  }
  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    if (Object.keys(record).length === 0) return [];
    return [record];
  }
  return [];
}

function normalizeEducation(value: unknown): EducationEntry[] {
  return toRecordArray(value).map((entry) => ({
    level: entry.level != null ? String(entry.level) : undefined,
    degree: entry.degree != null ? String(entry.degree) : undefined,
    schoolName:
      entry.schoolName != null
        ? String(entry.schoolName)
        : entry.university != null
          ? String(entry.university)
          : undefined,
    sessionStart:
      entry.sessionStart != null ? String(entry.sessionStart) : undefined,
    sessionEnd: entry.sessionEnd != null ? String(entry.sessionEnd) : undefined,
  }));
}

function normalizeCertifications(value: unknown): string[] {
  const parsed = parseValue(value);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (typeof item === "object" && item !== null) {
        return String((item as { name?: string }).name || "").trim();
      }
      return "";
    })
    .filter(Boolean);
}

function normalizeExpertise(value: unknown): ExpertiseEntry[] {
  return toRecordArray(value).map((entry) => ({
    category: entry.category != null ? String(entry.category) : undefined,
    level: entry.level != null ? String(entry.level) : undefined,
    techStack: Array.isArray(entry.techStack)
      ? entry.techStack.map((tech) => String(tech).trim()).filter(Boolean)
      : [],
  }));
}

function hasEducationContent(entry: EducationEntry): boolean {
  const sessionStart =
    entry.sessionStart != null ? String(entry.sessionStart).trim() : "";
  const sessionEnd =
    entry.sessionEnd != null ? String(entry.sessionEnd).trim() : "";

  return Boolean(
    entry.level?.trim() ||
      entry.degree?.trim() ||
      entry.schoolName?.trim() ||
      sessionStart ||
      sessionEnd,
  );
}

function hasExpertiseContent(entry: ExpertiseEntry): boolean {
  return Boolean(
    entry.category?.trim() ||
      entry.level?.trim() ||
      (entry.techStack && entry.techStack.length > 0),
  );
}

export function getEducationEntries(value: unknown): EducationEntry[] {
  return normalizeEducation(value).filter(hasEducationContent);
}

export function getCertificationNames(value: unknown): string[] {
  return normalizeCertifications(value);
}

export function getExpertiseEntries(value: unknown): ExpertiseEntry[] {
  return normalizeExpertise(value).filter(hasExpertiseContent);
}

function ProfileSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg text-[var(--accent)]">{icon}</span>
        <h4 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
          {title}
        </h4>
      </div>
      {children}
    </section>
  );
}

function EmptyProfileMessage({ message }: { message: string }) {
  return (
    <p className="text-sm italic text-[var(--text-muted)]">{message}</p>
  );
}

function EducationDisplay({ value }: { value: unknown }) {
  const entries = getEducationEntries(value);

  if (entries.length === 0) {
    return <EmptyProfileMessage message="No education information found." />;
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry, index) => {
        const institution = entry.schoolName?.trim();
        const session =
          entry.sessionStart && entry.sessionEnd
            ? `${entry.sessionStart} – ${entry.sessionEnd}`
            : entry.sessionStart || entry.sessionEnd || null;

        return (
          <li
            key={index}
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-3"
          >
            <p className="font-semibold text-[var(--text)]">
              {entry.degree?.trim() || entry.level?.trim() || "Education"}
            </p>
            {entry.level ? (
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Level: {entry.level}
              </p>
            ) : null}
            {institution ? (
              <p className="mt-1 text-sm text-[var(--text)]">{institution}</p>
            ) : null}
            {session ? (
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Session: {session}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function CertificationsDisplay({ value }: { value: unknown }) {
  const names = getCertificationNames(value);

  if (names.length === 0) {
    return <EmptyProfileMessage message="No certifications found." />;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {names.map((name) => (
        <li
          key={name}
          className="rounded-full bg-[var(--accent-muted)] px-3 py-1 text-sm font-medium text-[var(--accent)]"
        >
          {name}
        </li>
      ))}
    </ul>
  );
}

function ExpertiseDisplay({ value }: { value: unknown }) {
  const entries = getExpertiseEntries(value);

  if (entries.length === 0) {
    return <EmptyProfileMessage message="No expertise listed." />;
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry, index) => (
        <li
          key={index}
          className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-3"
        >
          <p className="font-semibold text-[var(--text)]">
            {[entry.category, entry.level].filter(Boolean).join(" · ") ||
              "Expertise"}
          </p>
          {entry.techStack && entry.techStack.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {entry.techStack.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full bg-[var(--surface-raised)] px-2 py-0.5 text-xs text-[var(--text-muted)]"
                >
                  {tech}
                </span>
              ))}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function UserEducationSection({ value }: { value: unknown }) {
  return (
    <ProfileSection title="Education" icon={<BiBook aria-hidden />}>
      <EducationDisplay value={value} />
    </ProfileSection>
  );
}

export function UserCertificationsSection({ value }: { value: unknown }) {
  return (
    <ProfileSection title="Certifications" icon={<BiAward aria-hidden />}>
      <CertificationsDisplay value={value} />
    </ProfileSection>
  );
}

export function UserExpertiseSection({ value }: { value: unknown }) {
  return (
    <ProfileSection title="Expertise" icon={<BiChip aria-hidden />}>
      <ExpertiseDisplay value={value} />
    </ProfileSection>
  );
}
