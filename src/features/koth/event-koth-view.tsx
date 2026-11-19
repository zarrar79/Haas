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
  respawnKothDeploy,
  resumeKoth,
  spawnKothDeploy,
  startKoth,
  stopKoth,
  stopKothDeploy,
  updateKothSession,
  uploadKothDeployYaml,
  type KothDeployMode,
  type KothHold,
  type KothSession,
  type KothTeamScore,
} from "@/features/koth/koth-api";
import { listTeams, type EventTeam } from "@/features/teams/team-api";
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

// ISO → value for <input type="datetime-local"> in the admin's local time.
function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

  const [name, setName] = useState("King of the Hill");
  const [playerTitle, setPlayerTitle] = useState("");
  const [playerDescription, setPlayerDescription] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vmIp, setVmIp] = useState("");
  const [initialScore, setInitialScore] = useState(100);
  const [kingScore, setKingScore] = useState(0);
  const [firstBloodScore, setFirstBloodScore] = useState(0);
  const [holdInterval, setHoldInterval] = useState(5);
  const [holdScore, setHoldScore] = useState(10);
  const [roundStartsAt, setRoundStartsAt] = useState("");
  const [roundEndsAt, setRoundEndsAt] = useState("");
  const [scorerUrl, setScorerUrl] = useState("");
  const [deployMode, setDeployMode] = useState<KothDeployMode>("existing_vm");
  const [agentTokenPaste, setAgentTokenPaste] = useState("");
  const [teams, setTeams] = useState<EventTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [yamlFileName, setYamlFileName] = useState<string | null>(null);

  const [configUnlocked, setConfigUnlocked] = useState(true);

  const canWrite = canMutateEvent(activeId);
  const configLocked = Boolean(session) && !configUnlocked;
  const fieldsDisabled = !canWrite || configLocked || busy !== null;

  useEffect(() => {
    setActiveId(hackathonId);
    setConfigUnlocked(true);
  }, [hackathonId, sessionId]);

  const applySession = useCallback((s: KothSession) => {
    setSession(s);
    setName(s.name || "King of the Hill");
    setPlayerTitle(s.player_title || "");
    setPlayerDescription(s.player_description || "");
    setSoundEnabled(s.sound_enabled !== false);
    setVmIp(s.vm_ip || "");
    setInitialScore(s.initial_score ?? 100);
    setKingScore(s.king_score ?? 0);
    setFirstBloodScore(s.first_blood_score ?? 0);
    setHoldInterval(s.hold_interval_seconds ?? 5);
    setHoldScore(s.hold_score ?? 10);
    setRoundStartsAt(toLocalInput(s.start_time));
    setRoundEndsAt(toLocalInput(s.end_time));
    setScorerUrl(s.scorer_pod_url || "");
    setDeployMode(s.deploy_mode || "existing_vm");
    if (s.deploy_team) setSelectedTeamId(s.deploy_team);
    if (s.deploy_yaml_set) setYamlFileName((prev) => prev || "(stored on server)");
  }, []);

  const load = useCallback(async () => {
    if (!activeId || !sessionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [sess, board, holdList, teamList] = await Promise.all([
        getKothSession(activeId, sessionId),
        getKothLeaderboard(activeId, sessionId),
        listKothHolds(activeId, sessionId),
        listTeams(activeId, { is_active: "true", limit: "200" }).catch(
          () => [] as EventTeam[],
        ),
      ]);
      applySession(sess);
      setLeaderboard(board.leaderboard || []);
      setHolds(holdList);
      setTeams(teamList);
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
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
      if (result && typeof result === "object") {
        const maybeSession =
          "status" in result && !("deploy_status" in result && "session" in result)
            ? (result as KothSession)
            : "session" in result &&
                (result as { session?: KothSession }).session
              ? (result as { session: KothSession }).session
              : "status" in result
                ? (result as KothSession)
                : null;
        if (maybeSession && maybeSession.id) {
          applySession(maybeSession);
        }
      }
      await load();
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
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
    if ((playerTitle || "") !== (session.player_title || "")) {
      impacts.push(`Player title: "${session.player_title || ""}" → "${playerTitle}"`);
    }
    if ((playerDescription || "") !== (session.player_description || "")) {
      impacts.push("Player description changed (blue-team KOTH page)");
    }
    if (soundEnabled !== (session.sound_enabled !== false)) {
      impacts.push(
        soundEnabled
          ? "Board sounds: off → on (players can use the sound button again)"
          : "Board sounds: on → off (sound button locked on player boards + live dashboard)",
      );
    }
    if ((vmIp || "") !== (session.vm_ip || "")) {
      impacts.push(
        `VM IP: "${session.vm_ip || ""}" → "${vmIp}" (scorer-pod picks this up without restart)`,
      );
    }
    if (initialScore !== session.initial_score) {
      impacts.push(
        `Initial score: ${session.initial_score} → ${initialScore} (one-time, first time each team is king; affects future kings only)`,
      );
    }
    if (kingScore !== (session.king_score ?? 0)) {
      impacts.push(
        `Become-king score: ${session.king_score ?? 0} → ${kingScore} (every time a team becomes king)`,
      );
    }
    if (firstBloodScore !== (session.first_blood_score ?? 0)) {
      impacts.push(
        `First blood: ${session.first_blood_score ?? 0} → ${firstBloodScore} (first king of this KOTH session only)`,
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
    if (roundStartsAt !== toLocalInput(session.start_time)) {
      impacts.push(
        roundStartsAt
          ? `Round starts at: ${new Date(roundStartsAt).toLocaleString()} (boards count down; session starts automatically)`
          : "Round start time cleared (no scheduled start; start it manually)",
      );
    }
    if (roundEndsAt !== toLocalInput(session.end_time)) {
      impacts.push(
        roundEndsAt
          ? `Round ends at: ${new Date(roundEndsAt).toLocaleString()} (boards count down to this; session stops automatically)`
          : "Round end time cleared (no scheduled end; stop it manually)",
      );
    }
    if ((scorerUrl || "") !== (session.scorer_pod_url || "")) {
      impacts.push(`Scorer pod URL changed`);
    }
    return impacts;
  };

  const requestUnlockConfig = async () => {
    const ok = await confirm({
      title: "Edit KOTH configuration?",
      message:
        "Unlocks scoring rules for editing. Rule changes apply to future kings / hold ticks only.",
      confirmLabel: "Unlock editing",
      cancelLabel: "Cancel",
    });
    if (ok) setConfigUnlocked(true);
  };

  const saveConfig = async () => {
    const impacts = buildConfigImpact().filter(
      (line) => !line.startsWith("VM IP:"),
    );
    if (impacts.length === 0) {
      setError("No configuration changes to save.");
      return;
    }
    const ok = await confirm({
      title: "Apply KOTH config changes?",
      message:
        "The following will change:\n\n" +
        impacts.map((line) => `• ${line}`).join("\n") +
        "\n\nContinue?",
      confirmLabel: "Save changes",
      cancelLabel: "Cancel",
    });
    if (!ok) return;

    const roundStartChanged =
      roundStartsAt !== toLocalInput(session?.start_time);
    const roundEndChanged =
      roundEndsAt !== toLocalInput(session?.end_time);
    if (
      roundStartChanged &&
      roundStartsAt &&
      new Date(roundStartsAt) <= new Date()
    ) {
      setError("Round start time must be in the future.");
      return;
    }
    if (roundEndChanged && roundEndsAt && new Date(roundEndsAt) <= new Date()) {
      setError("Round end time must be in the future.");
      return;
    }
    if (
      roundStartsAt &&
      roundEndsAt &&
      new Date(roundEndsAt) <= new Date(roundStartsAt)
    ) {
      setError("Round end time must be after the start time.");
      return;
    }

    await runAction("save", () =>
      updateKothSession(activeId, sessionId, {
        name,
        player_title: playerTitle,
        player_description: playerDescription,
        sound_enabled: soundEnabled,
        initial_score: initialScore,
        king_score: kingScore,
        first_blood_score: firstBloodScore,
        hold_interval_seconds: holdInterval,
        hold_score: holdScore,
        scorer_pod_url: scorerUrl,
        // Only send when edited: existing past times would fail validation.
        ...(roundStartChanged
          ? {
              start_time: roundStartsAt
                ? new Date(roundStartsAt).toISOString()
                : null,
            }
          : {}),
        ...(roundEndChanged
          ? {
              end_time: roundEndsAt
                ? new Date(roundEndsAt).toISOString()
                : null,
            }
          : {}),
      }),
    );
    setConfigUnlocked(false);
  };

  const saveExistingVmDeploy = async () => {
    if (!vmIp.trim()) {
      setError("VM IP is required for existing VM mode.");
      return;
    }
    if (!agentTokenPaste.trim() && !session?.scorer_agent_token_set) {
      setError(
        "Enter the scorer agent token the existing VM already uses (SCORER_AGENT_TOKEN).",
      );
      return;
    }
    await runAction("save-deploy", () =>
      updateKothSession(activeId, sessionId, {
        deploy_mode: "existing_vm",
        vm_ip: vmIp.trim(),
        ...(agentTokenPaste.trim()
          ? { scorer_agent_token: agentTokenPaste.trim() }
          : {}),
        sync_scorer: true,
      }),
    );
    setAgentTokenPaste("");
  };

  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === selectedTeamId) || null,
    [teams, selectedTeamId],
  );

  const deployStatusTone = (status?: string) => {
    switch (status) {
      case "running":
        return "success" as const;
      case "spawning":
      case "stopping":
        return "warning" as const;
      case "error":
        return "danger" as const;
      default:
        return "neutral" as const;
    }
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
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Failed to delete");
      setBusy(null);
    }
  };

  const kingLabel = useMemo(() => {
    if (!session?.current_team_name) return "No king";
    return `${session.current_team_name}${
      session.current_koth_code ? ` (${session.current_koth_code})` : ""
    }`;
  }, [session]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={session?.name || "King of the Hill"}
        description="Control this KOTH instance — scoring and deploy settings for one shared hill."
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
        <ListPageStat
          label="Sound"
          value={
            <Badge tone={session?.sound_enabled === false ? "neutral" : "success"}>
              {session?.sound_enabled === false ? "off" : "on"}
            </Badge>
          }
        />
        <ListPageStatsDot />
        <ListPageStat label="Current king" value={kingLabel} />
        <ListPageStatsDot />
        <ListPageStat label="Initial" value={`+${session?.initial_score ?? "—"}`} />
        <ListPageStatsDot />
        <ListPageStat label="Become king" value={`+${session?.king_score ?? 0}`} />
        <ListPageStatsDot />
        <ListPageStat label="First blood" value={`+${session?.first_blood_score ?? 0}`} />
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
            {canWrite && session ? (
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
                    setConfigUnlocked(false);
                  }}
                >
                  Lock
                </Button>
              )
            ) : null}
          </div>
          
          <label className="block text-xs text-[var(--text-muted)]">
            Name (admin)
            <input
              className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm disabled:opacity-60"
              value={name ?? ""}
              disabled={fieldsDisabled}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-xs text-[var(--text-muted)]">
            Player title
            <input
              className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm disabled:opacity-60"
              value={playerTitle ?? ""}
              disabled={fieldsDisabled}
              placeholder="Shown on blue-team KOTH page (falls back to name)"
              onChange={(e) => setPlayerTitle(e.target.value)}
            />
          </label>
          <label className="block text-xs text-[var(--text-muted)]">
            Player description
            <textarea
              className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm disabled:opacity-60"
              rows={3}
              value={playerDescription ?? ""}
              disabled={fieldsDisabled}
              placeholder="Shown under the title on the blue-team KOTH page"
              onChange={(e) => setPlayerDescription(e.target.value)}
            />
          </label>
          <label className="flex items-start gap-2 text-sm text-[var(--text)]">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 disabled:opacity-60"
              checked={soundEnabled}
              disabled={fieldsDisabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
            />
            <span>
              Board sounds enabled
              <span className="block text-xs text-[var(--text-muted)]">
                When off, the sound button on the blue-team KOTH board and live
                dashboard is locked and no capture / leader sounds play.
              </span>
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="block text-xs text-[var(--text-muted)]">
              Initial score (first time a team is king)
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
              Become-king score (every time)
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm disabled:opacity-60"
                value={kingScore}
                disabled={fieldsDisabled}
                onChange={(e) => setKingScore(Number(e.target.value))}
              />
            </label>
            <label className="block text-xs text-[var(--text-muted)]">
              First blood (first king of this session)
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm disabled:opacity-60"
                value={firstBloodScore}
                disabled={fieldsDisabled}
                onChange={(e) => setFirstBloodScore(Number(e.target.value))}
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
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-[var(--text-muted)]">
              Round starts at
              <input
                type="datetime-local"
                className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm disabled:opacity-60"
                value={roundStartsAt ?? ""}
                disabled={
                  fieldsDisabled ||
                  session?.status === "running" ||
                  session?.status === "paused"
                }
                onChange={(e) => setRoundStartsAt(e.target.value)}
              />
            </label>
            <label className="block text-xs text-[var(--text-muted)]">
              Round ends at
              <input
                type="datetime-local"
                className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm disabled:opacity-60"
                value={roundEndsAt ?? ""}
                disabled={fieldsDisabled}
                onChange={(e) => setRoundEndsAt(e.target.value)}
              />
            </label>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Boards count down to the start, then to the end. The session starts and
            stops automatically at these times; a manual Start/Stop overrides them.
            These are independent of the hackathon&apos;s own start / end time; leave empty to start / stop manually.
          </p>
          <label className="block text-xs text-[var(--text-muted)]">
            Scorer pod URL
            <input
              className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm disabled:opacity-60"
              placeholder="http://scorer-pod:8200"
              value={scorerUrl ?? ""}
              disabled={fieldsDisabled}
              onChange={(e) => setScorerUrl(e.target.value)}
            />
          </label>
          {canWrite && !configLocked ? (
            <Button size="sm" disabled={busy !== null} onClick={() => void saveConfig()}>
              {busy === "save" ? "Saving…" : "Save config"}
            </Button>
          ) : null}
        </div>

        <div className="space-y-3 rounded-lg border border-[var(--border)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[var(--text)]">Deploy</h2>
            <Badge tone={deployStatusTone(session?.deploy_status)}>
              {busy === "spawn" || busy === "respawn"
                ? "spawning…"
                : busy === "deploy-stop"
                  ? "stopping…"
                  : session?.deploy_status || "idle"}
            </Badge>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            YAML upload generates the agent token (copy below) and injects it into
            the YAML on spawn. Existing VM mode requires pasting the token already
            on that machine. The scorer pod authenticates with the single shared{" "}
            <code className="text-[10px]">KOTH_SCORER_POD_TOKEN</code> (web){" "}
            / <code className="text-[10px]">SCORER_POD_TOKEN</code> (scorer)
            from <code className="text-[10px]">.env</code> — no session id
            needed.
          </p>

          {session?.scorer_agent_token ? (
            <label className="block text-xs text-[var(--text-muted)]">
              Scorer agent token (created on YAML upload / spawn — synced to scorer)
              <div className="mt-1 flex gap-2">
                <input
                  readOnly
                  className="w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 font-mono text-xs"
                  value={session.scorer_agent_token}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      session.scorer_agent_token || "",
                    );
                  }}
                >
                  Copy
                </Button>
              </div>
            </label>
          ) : session?.scorer_agent_token_set ? (
            <p className="text-[11px] text-[var(--text-muted)]">
              Agent token is set — re-upload YAML or spawn to reveal / rotate.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={deployMode === "existing_vm" ? "secondary" : "ghost"}
              disabled={!canWrite || busy !== null}
              onClick={() => setDeployMode("existing_vm")}
            >
              Existing VM
            </Button>
            <Button
              size="sm"
              variant={deployMode === "yaml_deploy" ? "secondary" : "ghost"}
              disabled={!canWrite || busy !== null}
              onClick={() => setDeployMode("yaml_deploy")}
            >
              YAML deploy
            </Button>
          </div>

          {deployMode === "existing_vm" ? (
            <div key="existing-vm" className="space-y-3">
              <label className="block text-xs text-[var(--text-muted)]">
                VM IP
                <input
                  className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 font-mono text-sm disabled:opacity-60"
                  value={vmIp ?? ""}
                  disabled={!canWrite || busy !== null}
                  placeholder="e.g. 172.21.126.192"
                  onChange={(e) => setVmIp(e.target.value)}
                />
              </label>
              <label className="block text-xs text-[var(--text-muted)]">
                Scorer agent token (required)
                <input
                  type="password"
                  autoComplete="off"
                  className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm disabled:opacity-60"
                  value={agentTokenPaste ?? ""}
                  disabled={!canWrite || busy !== null}
                  placeholder={
                    session?.scorer_agent_token_set
                      ? "Leave blank to keep current token"
                      : "Paste SCORER_AGENT_TOKEN from the existing VM"
                  }
                  onChange={(e) => setAgentTokenPaste(e.target.value)}
                />
              </label>
              {canWrite ? (
                <Button
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => void saveExistingVmDeploy()}
                >
                  {busy === "save-deploy" ? "Saving…" : "Save & sync scorer"}
                </Button>
              ) : null}
            </div>
          ) : (
            <div key="yaml-deploy" className="space-y-3">
              <label className="block text-xs text-[var(--text-muted)]">
                Upload KOTH YAML
                <input
                  type="file"
                  accept=".yaml,.yml,text/yaml"
                  className="mt-1 block w-full text-sm disabled:opacity-60"
                  disabled={!canWrite || busy !== null}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    void runAction("upload-yaml", async () => {
                      const res = await uploadKothDeployYaml(
                        activeId,
                        sessionId,
                        file,
                      );
                      setYamlFileName(file.name);
                      // Prefer nested session (includes revealed agent token)
                      if (
                        res &&
                        typeof res === "object" &&
                        "session" in res &&
                        (res as { session?: KothSession }).session
                      ) {
                        applySession(
                          (res as { session: KothSession }).session,
                        );
                      }
                      return res;
                    });
                  }}
                />
                {yamlFileName || session?.deploy_yaml_set ? (
                  <span className="mt-1 block text-[11px]">
                    Stored: {yamlFileName || "yes"}
                  </span>
                ) : null}
              </label>
              <label className="block text-xs text-[var(--text-muted)]">
                Host team (namespace)
                <select
                  className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm disabled:opacity-60"
                  value={selectedTeamId ?? ""}
                  disabled={!canWrite || busy !== null}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                >
                  <option value="">Select team…</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.name_code || t.namespace
                        ? ` · ${t.name_code || t.namespace}`
                        : ""}
                      {t.pool_ip || t.ip_pool
                        ? ` · pool ${t.pool_ip || t.ip_pool}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
              {selectedTeam ? (
                <p className="text-[11px] text-[var(--text-muted)]">
                  Namespace:{" "}
                  <code>{selectedTeam.name_code || selectedTeam.namespace || "—"}</code>
                  {" · "}
                  Pool IP:{" "}
                  <code>{selectedTeam.pool_ip || selectedTeam.ip_pool || "—"}</code>
                </p>
              ) : null}
              <p className="text-[11px] text-[var(--text-muted)]">
                On Spawn, backend generates the agent token and replaces{" "}
                <code>SCORER_AGENT_TOKEN=&apos;KOTH_SCORER_AGENT_TOKEN&apos;</code> in the
                YAML before applying it.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={
                    !canWrite ||
                    busy !== null ||
                    !selectedTeamId ||
                    !(yamlFileName || session?.deploy_yaml_set)
                  }
                  onClick={() =>
                    void runAction("spawn", () =>
                      spawnKothDeploy(activeId, sessionId, {
                        team_id: selectedTeamId,
                      }),
                    )
                  }
                >
                  {busy === "spawn" ? "Spawning…" : "Spawn"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!canWrite || busy !== null}
                  onClick={() =>
                    void runAction("deploy-stop", () =>
                      stopKothDeploy(activeId, sessionId),
                    )
                  }
                >
                  {busy === "deploy-stop" ? "Stopping…" : "Stop"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={
                    !canWrite ||
                    busy !== null ||
                    !(yamlFileName || session?.deploy_yaml_set)
                  }
                  onClick={() =>
                    void runAction("respawn", () =>
                      respawnKothDeploy(activeId, sessionId),
                    )
                  }
                >
                  {busy === "respawn" ? "Respawning…" : "Respawn"}
                </Button>
              </div>
            </div>
          )}

          <div className="rounded border border-[var(--border)] bg-[var(--surface-muted,transparent)] p-3 text-xs space-y-2">
            <div className="font-medium text-[var(--text)]">Machine status</div>
            <div className="grid gap-1 font-mono text-[11px] text-[var(--text)]">
              <div>
                Status:{" "}
                <Badge tone={deployStatusTone(session?.deploy_status)}>
                  {busy === "spawn" || busy === "respawn"
                    ? "spawning"
                    : session?.deploy_status || "idle"}
                </Badge>
              </div>
              <div>
                VM IP: <code>{session?.vm_ip || vmIp || "—"}</code>
              </div>
              <div>
                Namespace:{" "}
                <code>
                  {session?.deploy_namespace ||
                    selectedTeam?.name_code ||
                    selectedTeam?.namespace ||
                    "—"}
                </code>
              </div>
              <div>
                Pool IP:{" "}
                <code>
                  {session?.deploy_team_pool_ip ||
                    selectedTeam?.pool_ip ||
                    selectedTeam?.ip_pool ||
                    "—"}
                </code>
              </div>
            </div>
            {session?.deploy_error ? (
              <Alert variant="error">{session.deploy_error}</Alert>
            ) : null}
            {busy === "spawn" || busy === "respawn" ? (
              <p className="text-[var(--text-muted)]">
                Waiting for VirtualMachineInstance IP…
              </p>
            ) : null}
          </div>
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
                  <div className="text-xs text-[var(--text-muted)]">{row.koth_code}</div>
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
              render: (row) => `${row.team_name} (${row.koth_code})`,
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
                String(
                  (row.initial_points || 0) +
                    (row.king_points || 0) +
                    (row.first_blood_points || 0) +
                    (row.hold_points || 0),
                ) + (row.first_blood_points ? " 🩸 first blood" : ""),
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
