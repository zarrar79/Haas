"use client";

import { useEffect, useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-fields";
import { ModalShell } from "@/components/ui/modal-shell";
import { TextField } from "@/components/ui/text-field";
import { NamespacePicker } from "@/features/attack-defence/ad-detail-panels";
import {
  createAdEvent,
  createAdPlaying,
  createAdPlayingTeam,
  listAdChallenges,
  listAdEvents,
  listAdNamespaces,
  type AdChallenge,
  type AdEvent,
} from "@/features/attack-defence/attack-defence-api";
import {
  listPlatformTeams,
  type EventTeam,
} from "@/features/teams/team-api";

type AssignMode = "random" | "manual";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (event: AdEvent) => void;
};

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildRandomAssignments(
  teamIds: string[],
  challengeIds: string[],
): Record<string, string> {
  const map: Record<string, string> = {};
  if (!teamIds.length || !challengeIds.length) return map;
  const pool = shuffle(challengeIds);
  teamIds.forEach((teamId, index) => {
    map[teamId] = pool[index % pool.length];
  });
  return map;
}

export function AdEventCreateModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("AD Event");
  const [description, setDescription] = useState("");
  const [totalRounds, setTotalRounds] = useState("10");
  const [roundDurationSec, setRoundDurationSec] = useState("720");
  const [uptimeInterval, setUptimeInterval] = useState("3");
  const [globalNamespace, setGlobalNamespace] = useState("");
  const [namespaceOptions, setNamespaceOptions] = useState<string[]>([]);

  const [teams, setTeams] = useState<EventTeam[]>([]);
  const [challenges, setChallenges] = useState<AdChallenge[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [selectedChallengeIds, setSelectedChallengeIds] = useState<string[]>([]);
  const [assignMode, setAssignMode] = useState<AssignMode>("random");
  const [manualMap, setManualMap] = useState<Record<string, string>>({});

  const [loadingLists, setLoadingLists] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoadingLists(true);
    void Promise.all([
      listPlatformTeams({ is_active: "true" }),
      listAdChallenges({ is_active: "true" }),
      listAdNamespaces({ is_active: "true" }),
      listAdEvents({ is_active: "true" }),
      listAdEvents({ status: "running", is_active: "true" }),
    ])
      .then(([teamRows, challengeRows, nsRows, eventRows, runningRows]) => {
        setTeams(teamRows);
        setChallenges(challengeRows);
        const names = new Set<string>();
        for (const ns of nsRows) {
          if (ns.name?.trim()) names.add(ns.name.trim());
        }
        for (const ev of [...runningRows, ...eventRows]) {
          const n = (ev.global_namespace || "").trim();
          if (n) names.add(n);
        }
        setNamespaceOptions(Array.from(names).sort((a, b) => a.localeCompare(b)));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load teams/challenges");
      })
      .finally(() => setLoadingLists(false));
  }, [open]);

  useEffect(() => {
    setManualMap((prev) => {
      const next: Record<string, string> = {};
      for (const teamId of selectedTeamIds) {
        const current = prev[teamId];
        if (current && selectedChallengeIds.includes(current)) {
          next[teamId] = current;
        } else if (selectedChallengeIds.length === 1) {
          next[teamId] = selectedChallengeIds[0];
        } else {
          next[teamId] = "";
        }
      }
      return next;
    });
  }, [selectedTeamIds, selectedChallengeIds]);

  const challengeById = useMemo(() => {
    const map = new Map<string, AdChallenge>();
    for (const c of challenges) map.set(c.id, c);
    return map;
  }, [challenges]);

  const toggleId = (
    id: string,
    selected: string[],
    setSelected: (next: string[]) => void,
  ) => {
    setSelected(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );
  };

  const submit = async () => {
    setError(null);
    const trimmed = name.trim() || "AD Event";
    if (!selectedTeamIds.length) {
      setError("Select at least one existing team.");
      return;
    }
    if (!selectedChallengeIds.length) {
      setError("Select at least one Attack & Defence challenge.");
      return;
    }

    let assignments: Record<string, string>;
    if (assignMode === "random") {
      assignments = buildRandomAssignments(
        selectedTeamIds,
        selectedChallengeIds,
      );
    } else {
      assignments = {};
      for (const teamId of selectedTeamIds) {
        const challengeId = manualMap[teamId];
        if (!challengeId) {
          setError("Manually assign a challenge to every selected team.");
          return;
        }
        if (!selectedChallengeIds.includes(challengeId)) {
          setError("Manual assignments must use selected challenges only.");
          return;
        }
        assignments[teamId] = challengeId;
      }
    }

    setBusy(true);
    try {
      const event = await createAdEvent({
        name: trimmed,
        description,
        total_rounds: Math.max(1, Number(totalRounds) || 10),
        round_duration_sec: Math.max(1, Number(roundDurationSec) || 720),
        uptime_check_interval_sec: Math.max(1, Number(uptimeInterval) || 3),
        global_namespace: globalNamespace.trim() || undefined,
        status: "draft",
      });
      const playing = await createAdPlaying({
        event: event.id,
        is_open: true,
        is_active: true,
      });
      for (const teamId of selectedTeamIds) {
        await createAdPlayingTeam({
          ad_playing: playing.id,
          team: teamId,
          challenge: assignments[teamId],
        });
      }
      onCreated(event);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      panelClassName="max-w-3xl"
      ariaLabel="Create Attack & Defence event"
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text)]">
            Create Attack & Defence event
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Single form — pick existing AD challenges and teams, then assign.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose} disabled={busy}>
          Close
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {error ? <Alert variant="error">{error}</Alert> : null}
        {loadingLists ? (
          <p className="text-sm text-[var(--text-muted)]">
            Loading teams and challenges…
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Event name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
          />
          <NamespacePicker
            label="Global namespace"
            value={globalNamespace}
            options={namespaceOptions}
            disabled={busy}
            allowCreate
            onChange={setGlobalNamespace}
            onCreated={(name) => {
              setNamespaceOptions((prev) =>
                Array.from(new Set([...prev, name])).sort((a, b) =>
                  a.localeCompare(b),
                ),
              );
              setGlobalNamespace(name);
            }}
          />
          <TextField
            label="Total rounds"
            type="number"
            value={totalRounds}
            onChange={(e) => setTotalRounds(e.target.value)}
            disabled={busy}
          />
          <TextField
            label="Round duration (sec)"
            type="number"
            value={roundDurationSec}
            onChange={(e) => setRoundDurationSec(e.target.value)}
            disabled={busy}
          />
          <TextField
            label="Uptime check interval (sec)"
            type="number"
            value={uptimeInterval}
            onChange={(e) => setUptimeInterval(e.target.value)}
            disabled={busy}
          />
        </div>
        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={busy}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--text)]">
              Existing teams ({selectedTeamIds.length} selected)
            </p>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-[var(--radius)] border border-[var(--border)] p-2">
              {teams.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No teams found.</p>
              ) : (
                teams.map((team) => (
                  <label
                    key={team.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-[var(--surface-hover)]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTeamIds.includes(team.id)}
                      disabled={busy}
                      onChange={() =>
                        toggleId(team.id, selectedTeamIds, setSelectedTeamIds)
                      }
                    />
                    <span className="truncate">
                      {team.name}
                      {team.team_code ? (
                        <span className="text-[var(--text-muted)]">
                          {" "}
                          ({team.team_code})
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--text)]">
              AD challenges ({selectedChallengeIds.length} selected)
            </p>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-[var(--radius)] border border-[var(--border)] p-2">
              {challenges.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">
                  No AD challenges yet — create them under Challenges first.
                </p>
              ) : (
                challenges.map((challenge) => (
                  <label
                    key={challenge.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-[var(--surface-hover)]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedChallengeIds.includes(challenge.id)}
                      disabled={busy}
                      onChange={() =>
                        toggleId(
                          challenge.id,
                          selectedChallengeIds,
                          setSelectedChallengeIds,
                        )
                      }
                    />
                    <span className="truncate">{challenge.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <FormSelect
          label="Challenge assignment to teams"
          value={assignMode}
          onChange={(v) => setAssignMode(v as AssignMode)}
          disabled={busy}
        >
          <option value="random">Random assignment</option>
          <option value="manual">Manual assignment</option>
        </FormSelect>

        {assignMode === "manual" ? (
          <div className="space-y-2 rounded-[var(--radius)] border border-[var(--border)] p-3">
            <p className="text-sm font-medium">Assign challenge per team</p>
            {!selectedTeamIds.length ? (
              <p className="text-xs text-[var(--text-muted)]">
                Select teams first.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedTeamIds.map((teamId) => {
                  const team = teams.find((t) => t.id === teamId);
                  return (
                    <FormSelect
                      key={teamId}
                      label={team?.name || teamId.slice(0, 8)}
                      value={manualMap[teamId] || ""}
                      onChange={(value) =>
                        setManualMap((prev) => ({ ...prev, [teamId]: value }))
                      }
                      disabled={busy || !selectedChallengeIds.length}
                    >
                      <option value="">Select challenge…</option>
                      {selectedChallengeIds.map((cid) => (
                        <option key={cid} value={cid}>
                          {challengeById.get(cid)?.name || cid.slice(0, 8)}
                        </option>
                      ))}
                    </FormSelect>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">
            Random mode shuffles selected challenges and assigns one to each
            selected team (reuses challenges if there are more teams than
            challenges).
          </p>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
        <Button variant="ghost" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={busy || loadingLists} onClick={() => void submit()}>
          {busy ? "Creating…" : "Create event"}
        </Button>
      </div>
    </ModalShell>
  );
}
