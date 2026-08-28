"use client";

import Link from "next/link";

import { GuidanceHint } from "@/components/ui/tooltip";
import { EVENT_ADMIN_GUIDANCE } from "@/features/dashboard/admin-guidance";

type Props = {
  hackathonId: string;
  className?: string;
};

export function AdminGuidancePanel({ hackathonId, className = "" }: Props) {
  return (
    <section
      className={`dashboard-section animate-fade-in-up ${className}`}
      style={{ animationDelay: "80ms" }}
    >
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
          Admin quick guide
        </h2>
        <GuidanceHint
          label="Admin guide"
          tip="Common event operations with direct links. Hover ? on each card for detailed guidance."
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {EVENT_ADMIN_GUIDANCE.map((item, index) => (
          <Link
            key={item.id}
            href={item.href(hackathonId)}
            className="dashboard-card group flex flex-col gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--accent)]/30 hover:shadow-[var(--shadow-sm)]"
            style={{ animationDelay: `${120 + index * 40}ms` }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--accent)]">
                {item.title}
              </span>
              <GuidanceHint label={item.title} tip={item.tip} />
            </div>
            <p className="text-xs leading-relaxed text-[var(--text-muted)]">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
