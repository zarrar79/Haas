"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyableText } from "@/components/ui/copyable-text";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { FilterSelect, StickyToolbar } from "@/components/ui/sticky-toolbar";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import { listChallengeAdmin } from "@/features/challenges/challenge-admin-api";
import type { ChallengeSummary } from "@/features/challenges/challenge-api";
import { HackathonPicker } from "@/features/events/hackathon-picker";
import {
  deleteScore,
  listScores,
  type ScoreRow,
} from "@/features/ops/ops-api";
import { ScoreFormModal } from "@/features/scores/score-form-modal";
import { listTeams, type EventTeam } from "@/features/teams/team-api";
import { listEventUsers, type EventUser } from "@/features/users/users-api";
import { ApiRequestError } from "@/lib/client-api";

type Props = { hackathonId: string };

type ValidityFilter = "all" | "correct" | "incorrect";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function userLabel(row: ScoreRow) {
  const d = row.user_detail;
  if (!d) return row.user || "—";
  const name = [d.name, d.last_name].filter(Boolean).join(" ").trim();
  return name || d.username || d.email || row.user || "—";
}

export function EventTeamScoresView({ hackathonId }: Props) {
  const router = useRouter();
  const { canMutateEvent } = useHaasAccess();
  const [activeId, setActiveId] = useState(hackathonId);
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [teams, setTeams] = useState<EventTeam[]>([]);
  const [challenges, setChallenges] = useState<ChallengeSummary[]>([]);
  const [users, setUsers] = useState<EventUser[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [challengeFilter, setChallengeFilter] = useState("");
  const [validityFilter, setValidityFilter] = useState<ValidityFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ScoreRow | null>(null);

  const canWrite = canMutateEvent(activeId);

  useEffect(() => {
    setActiveId(hackathonId);
  }, [hackathonId]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!activeId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [scoreList, teamList, challengeList, userList] = await Promise.all([
        listScores(activeId, {
          search: debouncedSearch || undefined,
          team: teamFilter || undefined,
          challenge: challengeFilter || undefined,
          answer_validity:
            validityFilter === "correct"
              ? "true"
              : validityFilter === "incorrect"
                ? "false"
                : undefined,
        }),
        listTeams(activeId, { limit: "200" }),
        listChallengeAdmin(activeId),
        listEventUsers(activeId),
      ]);
      setRows(scoreList);
      setTeams(teamList);
      setChallenges(challengeList);
      setUsers(userList);
    } catch (err) {
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load scores");
    } finally {
      setIsLoading(false);
    }
  }, [
    activeId,
    challengeFilter,
    debouncedSearch,
    router,
    teamFilter,
    validityFilter,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    return {
      count: rows.length,
      points: rows.reduce((sum, r) => sum + (r.score ?? 0), 0),
    };
  }, [rows]);

  async function onDelete(row: ScoreRow) {
    if (!window.confirm("Delete this score entry permanently?")) return;
    setBusyId(row.id);
    try {
      await deleteScore(activeId, row.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Event workspace"
        title="Team scores"
        description="Submission scores, bonuses, and first-blood points for this event."
        actions={
          <>
            <Button variant="secondary" onClick={() => void load()}>
              Refresh
            </Button>
            {canWrite ? (
              <Button
                onClick={() => {
                  setEditingRow(null);
                  setModalOpen(true);
                }}
              >
                Record score
              </Button>
            ) : null}
          </>
        }
      />

      <StickyToolbar layout="stack">
        <div className="flex flex-wrap items-end gap-3">
          <HackathonPicker
            value={activeId}
            onChange={setActiveId}
            section="scores"
          />
          <label className="flex min-w-[180px] flex-col gap-1 text-xs text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text)]">Search</span>
            <input
              className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Team, challenge, answer…"
            />
          </label>
          <FilterSelect
            label="Team"
            value={teamFilter}
            onChange={setTeamFilter}
          >
            <option value="">All teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Challenge"
            value={challengeFilter}
            onChange={setChallengeFilter}
          >
            <option value="">All challenges</option>
            {challenges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Validity"
            value={validityFilter}
            onChange={(v) => setValidityFilter(v as ValidityFilter)}
          >
            <option value="all">All</option>
            <option value="correct">Correct</option>
            <option value="incorrect">Incorrect</option>
          </FilterSelect>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          {totals.count} entries · {totals.points} total points
        </p>
      </StickyToolbar>

      {error ? (
        <div className="mb-3">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No score entries for this event."
        columns={[
          {
            key: "team",
            header: "Team",
            render: (r) => r.team_name || r.team || "—",
          },
          {
            key: "user",
            header: "User",
            render: (r) => userLabel(r),
          },
          {
            key: "challenge",
            header: "Challenge",
            render: (r) => r.challenge_name || r.challenge || "—",
          },
          {
            key: "question",
            header: "Question",
            render: (r) => r.question_name || r.challenges_questions || "—",
          },
          {
            key: "answer",
            header: "Submitted",
            render: (r) => (
              <CopyableText value={r.answer_submitted} maxWidthClass="max-w-[160px]" />
            ),
          },
          {
            key: "validity",
            header: "Valid",
            render: (r) =>
              r.answer_validity === true ? (
                <Badge tone="success">Correct</Badge>
              ) : r.answer_validity === false ? (
                <Badge tone="danger">Incorrect</Badge>
              ) : (
                <span className="text-[var(--text-muted)]">—</span>
              ),
          },
          {
            key: "score",
            header: "Score",
            render: (r) => (
              <span className="font-mono text-sm">{String(r.score ?? 0)}</span>
            ),
          },
          {
            key: "bonus",
            header: "Bonus / FB",
            render: (r) => (
              <span className="text-xs text-[var(--text-muted)]">
                {r.bonus_score ?? 0} / {r.first_blood_score ?? 0}
              </span>
            ),
          },
          {
            key: "when",
            header: "Created",
            render: (r) => (
              <span className="whitespace-nowrap text-xs text-[var(--text-muted)]">
                {formatDate(r.created_at)}
              </span>
            ),
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            render: (r) =>
              canWrite ? (
                <div className="flex flex-wrap justify-end gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyId === r.id}
                    onClick={() => {
                      setEditingRow(r);
                      setModalOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === r.id}
                    onClick={() => void onDelete(r)}
                  >
                    Delete
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-[var(--text-muted)]">—</span>
              ),
          },
        ]}
      />

      <ScoreFormModal
        open={modalOpen}
        mode={editingRow ? "edit" : "create"}
        hackathonId={activeId}
        row={editingRow}
        teams={teams}
        challenges={challenges}
        users={users}
        onClose={() => {
          setModalOpen(false);
          setEditingRow(null);
        }}
        onSaved={() => void load()}
      />
    </div>
  );
}
