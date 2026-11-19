"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyableText } from "@/components/ui/copyable-text";
import { DataTable } from "@/components/ui/data-table";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { PageHeader } from "@/components/ui/page-header";
import {
  ListPageStat,
  ListPageStats,
  ListPageStatsDot,
} from "@/components/ui/list-page-stats";
import { FilterSelect, FilterTextField, StickyToolbar } from "@/components/ui/sticky-toolbar";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import { listChallengeAdmin } from "@/features/challenges/challenge-admin-api";
import type { ChallengeSummary } from "@/features/challenges/challenge-api";
import {
  deleteScore,
  listScores,
  type ScoreRow,
} from "@/features/ops/ops-api";
import { ScoreFormModal } from "@/features/scores/score-form-modal";
import { listTeams, type EventTeam } from "@/features/teams/team-api";
import { listEventUsers, type EventUser } from "@/features/users/users-api";
import { redirectIfUnauthorized } from "@/lib/client-api";
import { formatDate } from "@/lib/format";
import { formatPersonName } from "@/lib/display-name";

type Props = {
  hackathonId: string;
  eyebrow?: string;
  title?: string;
};

type ValidityFilter = "all" | "correct" | "incorrect";

function userLabel(row: ScoreRow) {
  return formatPersonName(row.user_detail, row.user || "—");
}

export function EventTeamScoresView({
  hackathonId,
  eyebrow = "Event workspace",
  title = "Team submissions",
}: Props) {
  const { confirm } = usePlatformDialog();
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
      if (redirectIfUnauthorized(err, router)) return;
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
    const ok = await confirm({
      title: "Delete score",
      message: "Delete this score entry permanently?",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
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
        eyebrow={eyebrow}
        title={title}
        actions={
          canWrite ? (
            <Button
              onClick={() => {
                setEditingRow(null);
                setModalOpen(true);
              }}
            >
              Record score
            </Button>
          ) : undefined
        }
      />

      <StickyToolbar
        layout="stack"
        footer={
          <ListPageStats>
            <ListPageStat label="Entries" value={totals.count} />
            <ListPageStatsDot />
            <ListPageStat label="Points" value={totals.points} tone="accent" />
          </ListPageStats>
        }
      >
        <div className="flex flex-wrap items-end gap-3">
          <FilterTextField
            label="Search"
            value={search}
            onChange={setSearch}
            placeholder="Team, challenge, answer…"
          />
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
            className: "text-right w-12",
            render: (r) =>
              canWrite ? (
                <RowActionsMenu
                  label={`Actions for score ${r.id}`}
                  items={[
                    {
                      id: "edit",
                      label: "Edit",
                      disabled: busyId === r.id,
                      onClick: () => {
                        setEditingRow(r);
                        setModalOpen(true);
                      },
                    },
                    {
                      id: "delete",
                      label: "Delete",
                      disabled: busyId === r.id,
                      destructive: true,
                      onClick: () => void onDelete(r),
                    },
                  ]}
                />
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
