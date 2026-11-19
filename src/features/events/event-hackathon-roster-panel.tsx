"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  RosterTransfer,
  type RosterItem,
} from "@/components/ui/roster-transfer";
import { FormSkeleton } from "@/components/ui/skeleton";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import {
  addPlayingChallenges,
  listAllPlayingChallenges,
  removePlayingChallenge,
  type ChallengeSummary,
} from "@/features/challenges/challenge-api";
import {
  addPlayingTeams,
  listAllPlayingTeams,
  listPlatformTeams,
  removePlayingTeam,
  type EventTeam,
} from "@/features/teams/team-api";
import { redirectIfUnauthorized } from "@/lib/client-api";
import { haasListAll } from "@/lib/haas-api";

type Props = {
  hackathonId: string;
};

function teamItem(team: EventTeam): RosterItem {
  const metaParts = [
    team.team_code ? `Code ${team.team_code}` : null,
    team.register_as || null,
    team.is_blocked ? "Blocked" : null,
  ].filter(Boolean);
  return {
    id: team.id,
    label: team.name,
    meta: metaParts.length ? metaParts.join(" · ") : undefined,
  };
}

function challengeItem(row: {
  id: string;
  name: string;
  category_name?: string | null;
  difficulty_name?: string | null;
}): RosterItem {
  const metaParts = [row.category_name, row.difficulty_name].filter(Boolean);
  return {
    id: row.id,
    label: row.name,
    meta: metaParts.length ? metaParts.join(" · ") : undefined,
  };
}

export function EventHackathonRosterPanel({ hackathonId }: Props) {
  const router = useRouter();
  const { confirm } = usePlatformDialog();
  const [section, setSection] = useState<"teams" | "challenges">("teams");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [availableTeams, setAvailableTeams] = useState<RosterItem[]>([]);
  const [addedTeams, setAddedTeams] = useState<RosterItem[]>([]);
  const [availableChallenges, setAvailableChallenges] = useState<RosterItem[]>(
    [],
  );
  const [addedChallenges, setAddedChallenges] = useState<RosterItem[]>([]);

  const load = useCallback(async () => {
    if (!hackathonId) return;
    setLoading(true);
    setError(null);
    try {
      const [catalogTeams, playingTeams, catalogChallenges, playingChallenges] =
        await Promise.all([
          listPlatformTeams(),
          listAllPlayingTeams(hackathonId),
          haasListAll<ChallengeSummary>("challenge-list"),
          listAllPlayingChallenges(hackathonId),
        ]);

      const playingTeamIds = new Set(playingTeams.map((t) => t.id));
      const playingChallengeIds = new Set(playingChallenges.map((c) => c.id));

      // Ensure every playing team appears even if catalog page missed it.
      const teamById = new Map<string, EventTeam>();
      for (const t of catalogTeams) teamById.set(t.id, t);
      for (const t of playingTeams) teamById.set(t.id, t);

      setAddedTeams(
        playingTeams
          .map(teamItem)
          .sort((a, b) => a.label.localeCompare(b.label)),
      );
      setAvailableTeams(
        [...teamById.values()]
          .filter((t) => !playingTeamIds.has(t.id))
          .map(teamItem)
          .sort((a, b) => a.label.localeCompare(b.label)),
      );

      const challengeById = new Map<
        string,
        {
          id: string;
          name: string;
          category_name?: string | null;
          difficulty_name?: string | null;
        }
      >();
      for (const c of catalogChallenges) challengeById.set(c.id, c);
      for (const c of playingChallenges) challengeById.set(c.id, c);

      setAddedChallenges(
        playingChallenges
          .map(challengeItem)
          .sort((a, b) => a.label.localeCompare(b.label)),
      );
      setAvailableChallenges(
        [...challengeById.values()]
          .filter((c) => !playingChallengeIds.has(c.id))
          .map(challengeItem)
          .sort((a, b) => a.label.localeCompare(b.label)),
      );
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Failed to load roster");
    } finally {
      setLoading(false);
    }
  }, [hackathonId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addTeams(ids: string[]) {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await addPlayingTeams(hackathonId, ids);
      setInfo(`Added ${ids.length} team(s) to the playing roster.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add teams");
    } finally {
      setBusy(false);
    }
  }

  async function removeTeams(ids: string[]) {
    const ok = await confirm({
      title: "Remove teams from playing",
      message: `Remove ${ids.length} team(s) from this event's playing roster? Teams stay in the catalog.`,
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      for (const id of ids) {
        await removePlayingTeam(hackathonId, id);
      }
      setInfo(`Removed ${ids.length} team(s) from the playing roster.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove teams");
    } finally {
      setBusy(false);
    }
  }

  async function addChallenges(ids: string[]) {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await addPlayingChallenges(hackathonId, ids);
      setInfo(`Added ${ids.length} challenge(s) to the playing roster.`);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add challenges",
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeChallenges(ids: string[]) {
    const ok = await confirm({
      title: "Remove challenges from playing",
      message: `Remove ${ids.length} challenge(s) from this event's playing roster? Challenges stay in the catalog.`,
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      for (const id of ids) {
        await removePlayingChallenge(hackathonId, id);
      }
      setInfo(`Removed ${ids.length} challenge(s) from the playing roster.`);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove challenges",
      );
    } finally {
      setBusy(false);
    }
  }

  const summary = useMemo(
    () => ({
      teamsAdded: addedTeams.length,
      teamsAvailable: availableTeams.length,
      challengesAdded: addedChallenges.length,
      challengesAvailable: availableChallenges.length,
    }),
    [addedTeams, availableTeams, addedChallenges, availableChallenges],
  );

  if (loading) {
    return <FormSkeleton fields={6} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={section === "teams" ? "primary" : "secondary"}
          onClick={() => setSection("teams")}
        >
          Teams ({summary.teamsAdded} added)
        </Button>
        <Button
          size="sm"
          variant={section === "challenges" ? "primary" : "secondary"}
          onClick={() => setSection("challenges")}
        >
          Challenges ({summary.challengesAdded} added)
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void load()}
          disabled={busy}
        >
          Refresh
        </Button>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {info ? <Alert variant="success">{info}</Alert> : null}

      {section === "teams" ? (
        <RosterTransfer
          title="Team event approval"
          description="Catalog teams wait for approval. Move them onto the playing roster to approve (or remove to unapprove). Double-click a row to move it."
          availableLabel="Pending / catalog"
          addedLabel="Approved (playing)"
          available={availableTeams}
          added={addedTeams}
          busy={busy}
          onAdd={addTeams}
          onRemove={removeTeams}
        />
      ) : (
        <RosterTransfer
          title="Challenge playing roster"
          description="Move challenges between the catalog and this event's live playing hackathon. Double-click a row to move it."
          availableLabel="Available challenges"
          addedLabel="Added to playing"
          available={availableChallenges}
          added={addedChallenges}
          busy={busy}
          onAdd={addChallenges}
          onRemove={removeChallenges}
        />
      )}
    </div>
  );
}
