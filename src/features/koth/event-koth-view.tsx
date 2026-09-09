"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BiCrown, BiFlag, BiRefresh } from "react-icons/bi";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import {
  ListPageStat,
  ListPageStats,
  ListPageStatsDot,
} from "@/components/ui/list-page-stats";
import { StickyToolbar } from "@/components/ui/sticky-toolbar";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import { HackathonPicker } from "@/features/events/hackathon-picker";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import {
  deleteKothSession,
  getKothLeaderboard,
  getKothSession,
  listKothHolds,
  pauseKoth,
  resetKothFlag,
  resetKothScores,
  resetKothVm,
  resumeKoth,
  startKoth,
  stopKoth,
  updateKothSession,
  type KothHold,
  type KothSession,
  type KothTeamScore,
} from "@/features/koth/koth-api";
import { redirectIfUnauthorized } from "@/lib/client-api";
import { formatDate } from "@/lib/format";

type Props = { hackathonId: string; sessionId: string };

function statusTone(status: string) {
  switch (status) {
    case "running":
      return "success" as const;
    case "paused":
      return "warning" as const;
    case "stopped":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

function formatHold(seconds: number) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (h > 0) return `${h}h ${m}m ${rem}s`;
  if (m > 0) return `${m}m ${rem}s`;
  return `${rem}s`;
}

export function EventKothView({ hackathonId, sessionId }: Props) {
  const { confirm } = usePlatformDialog();
  const router = useRouter();
  const { canMutateEvent } = useHaasAccess();
  const { setSelectedHackathonId } = useSelectedEvent();
  const [activeId, setActiveId] = useState(hackathonId);
  const [session, setSession] = useState<KothSession | null>(null);
  const [leaderboard, setLeaderboard] = useState<KothTeamScore[]>([]);
  const [holds, setHolds] = useState<KothHold[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);

  const [name, setName] = useState("King of the Hill");
  const [initialScore, setInitialScore] = useState(100);
  const [holdInterval, setHoldInterval] = useState(5);
  const [holdScore, setHoldScore] = useState(10);
  const [scorerUrl, setScorerUrl] = useState("");
  const [scorerToken, setScorerToken] = useState("");

  const [configUnlocked, setConfigUnlocked] = useState(false);

  const canWrite = canMutateEvent(activeId);
  const configLocked = Boolean(session?.ingest_token_set) && !configUnlocked;
  const fieldsDisabled = !canWrite || configLocked || busy !== null;

  useEffect(() => {
    setActiveId(hackathonId);
    setConfigUnlocked(false);
  }, [hackathonId, sessionId]);

  const applySession = useCallback((s: KothSession) => {
    setSession(s);
    setName(s.name || "King of the Hill");
    setInitialScore(s.initial_score ?? 100);
    setHoldInterval(s.hold_interval_seconds ?? 5);
    setHoldScore(s.hold_score ?? 10);
    setScorerUrl(s.scorer_pod_url || "");
    if (s.ingest_token) setRevealedToken(s.ingest_token);
  }, []);

  const load = useCallback(async () => {
    if (!activeId || !sessionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [sess, board, holdList] = await Promise.all([
        getKothSession(activeId, sessionId),
        getKothLeaderboard(activeId, sessionId),
        listKothHolds(activeId, sessionId),
      ]);
      applySession(sess);
      setLeaderboard(board.leaderboard || []);
      setHolds(holdList);
    } catch (err) {
      if (redirectIfUnauthorized(err)) return;
      setError(err instanceof Error ? err.message : "Failed to load KOTH");
    } finally {
      setIsLoading(false);
    }
  }, [activeId, sessionId, applySession]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (key: string, fn: () => Promise<KothSession | unknown>) => {
    setBusy(key);
    setError(null);
    try {
      const result = await fn();
      if (result && typeof result === "object" && "status" in (result as object)) {
        applySession(result as KothSession);
        if ((result as KothSession).ingest_token) {
          setRevealedToken((result as KothSession).ingest_token || null);
        }
      }
      await load();
    } catch (err) {
      if (redirectIfUnauthorized(err)) return;
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const buildConfigImpact = () => {
    if (!session) return [] as string[];
    const impacts: string[] = [];
    if ((name || "") !== (session.name || "")) {
      impacts.push(`Name: "${session.name || ""}" → "${name}"`);
    }
    if (initialScore !== session.initial_score) {
      impacts.push(
        `Initial score: ${session.initial_score} → ${initialScore} (only affects new kings after save)`,
      );
    }
    if (holdInterval !== session.hold_interval_seconds) {
      impacts.push(
        `Hold interval: ${session.hold_interval_seconds}s → ${holdInterval}s (affects future hold awards)`,
      );
    }
    if (holdScore !== session.hold_score) {
      impacts.push(
        `Hold score: ${session.hold_score} → ${holdScore} (affects future hold awards)`,
      );
    }
    if ((scorerUrl || "") !== (session.scorer_pod_url || "")) {
      impacts.push(
        `Scorer pod URL changed — Reset VM / Reset flag will call the new URL`,
      );
    }
    if (scorerToken.trim()) {
      impacts.push(
        `Scorer pod token will be replaced — Haas must use the new token for reset calls`,
      );
    }
    return impacts;
  };

  const requestUnlockConfig = async () => {
    const ok = await confirm({
      title: "Edit KOTH configuration?",
      message:
        "This unlocks scoring rules and scorer settings for editing.\n\n" +
        "Impact if you save changes:\n" +
        "• Scoring rule changes apply to future kings / hold ticks only\n" +
        "• Changing scorer pod URL/token affects Reset VM / Reset flag\n" +
        "• Ingest token is NOT rotated unless you explicitly click Rotate\n\n" +
        "Rotating the ingest token would break the running scorer-pod until you update its .env and restart it.",
      confirmLabel: "Unlock editing",
      cancelLabel: "Cancel",
    });
    if (ok) setConfigUnlocked(true);
  };

  const saveConfig = async () => {
    const impacts = buildConfigImpact();
    if (impacts.length === 0) {
      setError("No configuration changes to save.");
      return;
    }
    const ok = await confirm({
      title: "Apply KOTH config changes?",
      message:
        "The following will change:\n\n" +
        impacts.map((line) => `• ${line}`).join("\n") +
        "\n\nIngest token stays the same (scorer-pod does not need a restart for these changes)." +
        "\n\nContinue?",
      confirmLabel: "Save changes",
      cancelLabel: "Cancel",
    });
    if (!ok) return;

    await runAction("save", () =>
      updateKothSession(activeId, sessionId, {
        name,
        initial_score: initialScore,
        hold_interval_seconds: holdInterval,
        hold_score: holdScore,
        scorer_pod_url: scorerUrl,
        ...(scorerToken.trim() ? { scorer_pod_token: scorerToken.trim() } : {}),
      }),
    );
    setScorerToken("");
    setConfigUnlocked(false);
  };

  const rotateIngestToken = async () => {
    const ok = await confirm({
      title: "Rotate ingest token?",
      message:
        "Impact:\n" +
        "• A new ingest Bearer token is generated immediately\n" +
        "• The old token stops working right away\n" +
        "• Running scorer-pod will get 403 until you update KOTH_INGEST_TOKEN in its .env and restart uvicorn\n" +
        "• Live scoring pauses until the scorer reconnects with the new token\n\n" +
        "Only do this if the token was leaked or you intentionally want to re-key.\n\n" +
        "Continue?",
      confirmLabel: "Rotate token",
      cancelLabel: "Cancel",
      destructive: true,
    });
    if (!ok) return;
    await runAction("rotate", () =>
      updateKothSession(activeId, sessionId, { rotate_ingest_token: true }),
    );
  };

  const onHackathonChange = (nextId: string) => {
    setActiveId(nextId);
    setSelectedHackathonId(nextId);
    router.push(`/events/${nextId}/koth`);
  };

  const onDeleteInstance = async () => {
    if (!session) return;
    const ok = await confirm({
      title: "Delete this KOTH instance?",
      message:
        `“${session.name}” will be removed from the instance list.\n` +
        (session.status === "running" || session.status === "paused"
          ? "It will be stopped first.\n"
          : "") +
        "You will return to the KOTH list.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    setBusy("delete");
    setError(null);
    try {
      await deleteKothSession(activeId, sessionId);
      router.push(`/events/${activeId}/koth`);
    } catch (err) {
      if (redirectIfUnauthorized(err)) return;
      setError(err instanceof Error ? err.message : "Failed to delete");
      setBusy(null);
    }
  };

  const kingLabel = useMemo(() => {
    if (!session?.current_team_name) return "No king";
    return `${session.current_team_name}${
      session.current_team_code ? ` (${session.current_team_code})` : ""
    }`;
  }, [session]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={session?.name || "King of the Hill"}
        description="Control this KOTH instance — scoring, ingest token, and scorer pod are isolated from other instances on the same hackathon."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => router.push(`/events/${activeId}/koth`)}
            >
              All instances
            </Button>
            {canWrite ? (
              <Button
                size="sm"
                variant="danger"
                disabled={busy !== null}
                onClick={() => void onDeleteInstance()}
              >
                {busy === "delete" ? "Deleting…" : "Delete"}
              </Button>
            ) : null}
            <HackathonPicker value={activeId} onChange={onHackathonChange} section="koth" />
          </div>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <ListPageStats>
        <ListPageStat
          label="Status"
          value={
            <Badge tone={statusTone(session?.status || "idle")}>
              {session?.status || "idle"}
            </Badge>
          }
        />
        <ListPageStatsDot />
        <ListPageStat label="Current king" value={kingLabel} />
        <ListPageStatsDot />
        <ListPageStat label="Initial" value={`+${session?.initial_score ?? "—"}`} />
        <ListPageStatsDot />
        <ListPageStat
          label="Hold"
          value={`+${session?.hold_score ?? "—"} / ${session?.hold_interval_seconds ?? "—"}s`}
        />
        <ListPageStatsDot />
        <ListPageStat label="Teams scored" value={String(leaderboard.length)} />
      </ListPageStats>

      <StickyToolbar>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={!canWrite || busy !== null || session?.status === "running"}
            onClick={() => void runAction("start", () => startKoth(activeId, sessionId))}
          >
            <BiCrown className="mr-1" />
            {busy === "start" ? "Starting…" : "Start"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={!canWrite || busy !== null || session?.status !== "running"}
            onClick={() => void runAction("pause", () => pauseKoth(activeId, sessionId))}
          >
            {busy === "pause" ? "Pausing…" : "Pause"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={
              !canWrite ||
              busy !== null ||
              (session?.status !== "paused" && session?.status !== "stopped")
            }
            onClick={() => void runAction("resume", () => resumeKoth(activeId, sessionId))}
          >
            {busy === "resume" ? "Resuming…" : "Resume"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={
              !canWrite ||
              busy !== null ||
              session?.status === "stopped" ||
              session?.status === "idle"
            }
            onClick={() => void runAction("stop", () => stopKoth(activeId, sessionId))}
          >
            {busy === "stop" ? "Stopping…" : "Stop"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!canWrite || busy !== null}
            onClick={async () => {
              const ok = await confirm({
                title: "Reset KOTH scores?",
                message:
                  "Clears kings, holds, and points. Config is kept. Status returns to idle.",
                confirmLabel: "Reset scores",
                destructive: true,
              });
              if (!ok) return;
              await runAction("reset-scores", () =>
                resetKothScores(activeId, sessionId),
              );
            }}
          >
            <BiRefresh className="mr-1" />
            Reset scores
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!canWrite || busy !== null || !session?.scorer_pod_url}
            onClick={async () => {
              const ok = await confirm({
                title: "Reset VM via scorer pod?",
                message: "Calls the scorer pod reset/vm endpoint.",
                confirmLabel: "Reset VM",
              });
              if (!ok) return;
              await runAction("reset-vm", () => resetKothVm(activeId, sessionId));
            }}
          >
            Reset VM
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!canWrite || busy !== null || !session?.scorer_pod_url}
            onClick={async () => {
              const ok = await confirm({
                title: "Reset flag via scorer pod?",
                message: "Calls the scorer pod reset/flag endpoint.",
                confirmLabel: "Reset flag",
              });
              if (!ok) return;
              await runAction("reset-flag", () => resetKothFlag(activeId, sessionId));
            }}
          >
            <BiFlag className="mr-1" />
            Reset flag
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy !== null}
            onClick={() => void load()}
          >
            Refresh
          </Button>
        </div>
      </StickyToolbar>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-[var(--border)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)]">Scoring rules</h2>
            
            </div>
            {canWrite && session?.ingest_token_set ? (
              configLocked ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy !== null}
                  onClick={() => void requestUnlockConfig()}
                >
                  Edit config
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy !== null}
                  onClick={() => {
                    applySession(session);
                    setScorerToken("");
                    setConfigUnlocked(false);
                  }}
                >
                  Lock
                </Button>
              )
            ) : null}
          </div>
          
          <label className="block text-xs text-[var(--text-muted)]">
            Name
            <input
              className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm disabled:opacity-60"
              value={name}
              disabled={fieldsDisabled}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="block text-xs text-[var(--text-muted)]">
              Initial score
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm disabled:opacity-60"
                value={initialScore}
                disabled={fieldsDisabled}
                onChange={(e) => setInitialScore(Number(e.target.value))}
              />
            </label>
            <label className="block text-xs text-[var(--text-muted)]">
              Hold interval (s)
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm disabled:opacity-60"
                value={holdInterval}
                disabled={fieldsDisabled}
                onChange={(e) => setHoldInterval(Number(e.target.value))}
              />
            </label>
            <label className="block text-xs text-[var(--text-muted)]">
              Hold score
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm disabled:opacity-60"
                value={holdScore}
                disabled={fieldsDisabled}
                onChange={(e) => setHoldScore(Number(e.target.value))}
              />
            </label>
          </div>
          {canWrite && !configLocked ? (
            <Button size="sm" disabled={busy !== null} onClick={() => void saveConfig()}>
              {busy === "save" ? "Saving…" : "Save config"}
            </Button>
          ) : null}
        </div>

        <div className="space-y-3 rounded-lg border border-[var(--border)] p-4">
          <h2 className="text-sm font-semibold text-[var(--text)]">Scorer pod</h2>
       
          <label className="block text-xs text-[var(--text-muted)]">
            Scorer pod URL
            <input
              className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm disabled:opacity-60"
              placeholder="http://scorer-pod:8200"
              value={scorerUrl}
              disabled={fieldsDisabled}
              onChange={(e) => setScorerUrl(e.target.value)}
            />
          </label>
          <label className="block text-xs text-[var(--text-muted)]">
            Scorer pod token{" "}
            {session?.scorer_pod_token_set ? (
              <span className="text-[var(--text-muted)]">(set)</span>
            ) : null}
            <input
              type="password"
              autoComplete="off"
              className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm disabled:opacity-60"
              placeholder={session?.scorer_pod_token_set ? "••••••••" : "Bearer token"}
              value={scorerToken}
              disabled={fieldsDisabled}
              onChange={(e) => setScorerToken(e.target.value)}
            />
          </label>
          <div className="rounded border border-dashed border-[var(--border)] p-3 text-xs">
            <div className="mb-1 font-medium text-[var(--text)]">Ingest token</div>
            <p className="mb-2 text-[var(--text-muted)]">
            
            </p>
            <code className="block break-all text-[11px] text-[var(--text)]">
              {revealedToken ||
                (session?.ingest_token_set
                  ? "(set — locked; rotate only if you must re-key)"
                  : "(not set — start KOTH to generate)")}
            </code>
            {canWrite ? (
              <Button
                size="sm"
                variant="danger"
                className="mt-2"
                disabled={busy !== null}
                onClick={() => void rotateIngestToken()}
              >
                {busy === "rotate" ? "Rotating…" : "Rotate ingest token"}
              </Button>
            ) : null}
          </div>
          {session?.id ? (
            <p className="text-[11px] text-[var(--text-muted)]">
              Ingest URL:{" "}
              <code className="break-all">
                /koth/sessions/{session.id}/ingest/
              </code>
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text)]">KOTH leaderboard</h2>
        <DataTable
          isLoading={isLoading}
          emptyMessage="No KOTH scores yet."
          rowKey={(row) => row.id}
          rows={leaderboard}
          columns={[
            {
              key: "rank",
              header: "#",
              render: (row) =>
                String(leaderboard.findIndex((r) => r.id === row.id) + 1),
            },
            {
              key: "team",
              header: "Team",
              render: (row) => (
                <div>
                  <div className="font-medium">{row.team_name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{row.team_code}</div>
                </div>
              ),
            },
            {
              key: "score",
              header: "Score",
              render: (row) => String(row.total_score),
            },
            {
              key: "reigns",
              header: "Became king",
              render: (row) => String(row.times_became_king),
            },
            {
              key: "dethroned",
              header: "Dethroned",
              render: (row) => String(row.times_dethroned),
            },
            {
              key: "hold",
              header: "Hold time",
              render: (row) => formatHold(row.total_hold_seconds),
            },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text)]">Hold history</h2>
        <DataTable
          emptyMessage="No holds recorded."
          rowKey={(row) => row.id}
          rows={holds}
          columns={[
            {
              key: "team",
              header: "Team",
              render: (row) => `${row.team_name} (${row.team_code})`,
            },
            {
              key: "started",
              header: "Started",
              render: (row) => formatDate(row.started_at),
            },
            {
              key: "ended",
              header: "Ended",
              render: (row) => (row.ended_at ? formatDate(row.ended_at) : "active"),
            },
            {
              key: "points",
              header: "Points",
              render: (row) =>
                String((row.initial_points || 0) + (row.hold_points || 0)),
            },
            {
              key: "hold",
              header: "Duration",
              render: (row) => formatHold(row.hold_seconds),
            },
            {
              key: "reason",
              header: "End reason",
              render: (row) => row.end_reason || (row.is_active ? "—" : ""),
            },
          ]}
        />
      </section>
    </div>
  );
}
