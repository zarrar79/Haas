"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/loader";
import { StickyToolbar } from "@/components/ui/sticky-toolbar";
import { TextField } from "@/components/ui/text-field";
import { HackathonPicker } from "@/features/events/hackathon-picker";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import {
  assignHackathonAdmin,
  listHackathonAdmins,
  revokeHackathonAdmin,
  type HackathonAdminBinding,
} from "@/features/hackathon-admins/hackathon-admin-api";
import {
  getModules,
  getPlaying,
  getSettings,
  getUserRules,
  patchModules,
  patchPlaying,
  patchSettings,
  patchUserRules,
  type EventModules,
  type EventSettings,
  type PlayingState,
  type UserRules,
} from "@/features/settings/settings-api";
import {
  addPlayingChallenges,
  addPlayingTeams,
  removePlayingChallenge,
  removePlayingTeam,
} from "@/features/challenges/challenge-admin-api";
import { ApiRequestError } from "@/lib/client-api";

type Tab = "settings" | "modules" | "rules" | "playing" | "admins";

type Props = { hackathonId: string };

const MANAGER_SETTING_KEYS = [
  "broadcast_message",
  "dashboard_auto",
  "dashboard_auto_interval",
  "set_spawning_queue_message",
  "hackathon_stop_message",
  "important_message",
  "is_important_message_show",
  "max_team_challenge_spawn_limit",
  "per_team_windows_machine_limit",
  "per_team_linux_machine_limit",
] as const;

export function EventSettingsView({ hackathonId }: Props) {
  const router = useRouter();
  const { canMutateEvent, isRoot } = useHaasAccess();
  const [activeId, setActiveId] = useState(hackathonId);
  const [tab, setTab] = useState<Tab>("settings");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<EventSettings>({});
  const [modules, setModules] = useState<EventModules>({});
  const [rules, setRules] = useState<UserRules>({});
  const [playing, setPlaying] = useState<PlayingState>({});
  const [admins, setAdmins] = useState<HackathonAdminBinding[]>([]);
  const [adminUser, setAdminUser] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [settingsJson, setSettingsJson] = useState("{}");
  const [rosterChallengeId, setRosterChallengeId] = useState("");
  const [rosterTeamId, setRosterTeamId] = useState("");

  const canWrite = canMutateEvent(activeId);

  useEffect(() => {
    setActiveId(hackathonId);
  }, [hackathonId]);

  const load = useCallback(async () => {
    if (!activeId) return;
    setIsLoading(true);
    setError(null);
    try {
      const adminPromise = isRoot
        ? listHackathonAdmins({ hackathon: activeId })
        : Promise.resolve([] as HackathonAdminBinding[]);
      const [s, m, r, p, adminRows] = await Promise.all([
        getSettings(activeId),
        getModules(activeId),
        getUserRules(activeId),
        getPlaying(activeId),
        adminPromise,
      ]);
      setSettings(s || {});
      setSettingsJson(JSON.stringify(s || {}, null, 2));
      setModules(m || {});
      setRules(r || {});
      setPlaying(p || {});
      setAdmins(adminRows);
    } catch (err) {
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }, [activeId, isRoot, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSettings() {
    setError(null);
    setInfo(null);
    try {
      const parsed = JSON.parse(settingsJson) as EventSettings;
      const saved = await patchSettings(activeId, parsed);
      setSettings(saved);
      setSettingsJson(JSON.stringify(saved, null, 2));
      setInfo("Settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    }
  }

  async function saveModules() {
    setError(null);
    try {
      setModules(await patchModules(activeId, modules));
      setInfo("Modules saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save modules");
    }
  }

  async function saveRules() {
    setError(null);
    try {
      setRules(await patchUserRules(activeId, rules));
      setInfo("User rules saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save rules");
    }
  }

  async function savePlaying() {
    setError(null);
    try {
      setPlaying(
        await patchPlaying(activeId, {
          is_open: Boolean(playing.is_open),
          is_active: Boolean(playing.is_active),
        }),
      );
      setInfo("Playing state saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save playing");
    }
  }

  async function onAssignAdmin() {
    if (!adminUser.trim()) return;
    setError(null);
    try {
      await assignHackathonAdmin({
        user: adminUser.trim(),
        hackathon: activeId,
        notes: adminNotes.trim() || undefined,
      });
      setAdminUser("");
      setAdminNotes("");
      await load();
      setInfo("Hackathon admin assigned.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to assign hackathon admin",
      );
    }
  }

  async function onRevokeAdmin(bindingId: string) {
    if (!window.confirm("Revoke this hackathon admin binding?")) return;
    try {
      await revokeHackathonAdmin(bindingId);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to revoke hackathon admin",
      );
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "settings", label: "Settings" },
    { id: "modules", label: "Modules" },
    { id: "rules", label: "User rules" },
    { id: "playing", label: "Playing" },
    ...(isRoot ? [{ id: "admins" as const, label: "Hackathon admins" }] : []),
  ];

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Event workspace"
        title="Settings"
        description="Event settings, modules, user rules, and live playing flags."
        actions={
          <Button variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      <StickyToolbar layout="stack">
        <HackathonPicker
          value={activeId}
          onChange={setActiveId}
          section="settings"
        />

        <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? "primary" : "secondary"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
        </div>
      </StickyToolbar>

      {error ? (
        <div className="mb-3">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}
      {info ? (
        <div className="mb-3">
          <Alert variant="info">{info}</Alert>
        </div>
      ) : null}

      {isLoading ? <PageLoader label="Loading settings…" /> : null}

      {!isLoading && tab === "settings" ? (
        <div className="space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs text-[var(--text-muted)]">
            Managers may only PATCH ops fields (
            {MANAGER_SETTING_KEYS.join(", ")}
            ). Organizers can PATCH the full object.
          </p>
          <textarea
            className="min-h-[280px] w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-xs text-[var(--text)]"
            value={settingsJson}
            onChange={(e) => setSettingsJson(e.target.value)}
          />
          <Button onClick={() => void saveSettings()} disabled={!canWrite}>
            Save settings
          </Button>
          <pre className="overflow-auto rounded-[var(--radius-sm)] bg-[var(--bg)] p-3 text-[10px] text-[var(--text-muted)]">
            {JSON.stringify(settings, null, 2)}
          </pre>
        </div>
      ) : null}

      {!isLoading && tab === "modules" ? (
        <div className="space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
          {(
            [
              ["jeopardy_enabled", "Jeopardy"],
              ["koth_enabled", "King of the Hill"],
              ["attack_defence_enabled", "Attack & Defence"],
              ["viewer_can_export", "Viewer can export CSV"],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-2 text-sm text-[var(--text)]"
            >
              <input
                type="checkbox"
                checked={Boolean(modules[key])}
                onChange={(e) =>
                  setModules((prev) => ({ ...prev, [key]: e.target.checked }))
                }
              />
              {label}
            </label>
          ))}
          <Button onClick={() => void saveModules()} disabled={!canWrite}>
            Save modules
          </Button>
        </div>
      ) : null}

      {!isLoading && tab === "rules" ? (
        <div className="grid gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2">
          <TextField
            label="Max attempts (0 = inherit)"
            name="max_attempts"
            type="number"
            value={String(rules.max_attempts ?? 0)}
            onChange={(e) =>
              setRules((prev) => ({
                ...prev,
                max_attempts: Number(e.target.value),
              }))
            }
          />
          <TextField
            label="Spawn limit (0 = inherit)"
            name="spawn_limit"
            type="number"
            value={String(rules.spawn_limit ?? 0)}
            onChange={(e) =>
              setRules((prev) => ({
                ...prev,
                spawn_limit: Number(e.target.value),
              }))
            }
          />
          <label className="flex items-center gap-2 text-sm text-[var(--text)]">
            <input
              type="checkbox"
              checked={Boolean(rules.vpn_allowed)}
              onChange={(e) =>
                setRules((prev) => ({ ...prev, vpn_allowed: e.target.checked }))
              }
            />
            VPN allowed
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--text)]">
            <input
              type="checkbox"
              checked={Boolean(rules.force_password_policy)}
              onChange={(e) =>
                setRules((prev) => ({
                  ...prev,
                  force_password_policy: e.target.checked,
                }))
              }
            />
            Force password policy
          </label>
          <div className="sm:col-span-2">
            <Button onClick={() => void saveRules()} disabled={!canWrite}>
              Save user rules
            </Button>
          </div>
        </div>
      ) : null}

      {!isLoading && tab === "playing" ? (
        <div className="space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <label className="flex items-center gap-2 text-sm text-[var(--text)]">
            <input
              type="checkbox"
              checked={Boolean(playing.is_open)}
              onChange={(e) =>
                setPlaying((prev) => ({ ...prev, is_open: e.target.checked }))
              }
            />
            Event open (`is_open`)
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--text)]">
            <input
              type="checkbox"
              checked={Boolean(playing.is_active)}
              onChange={(e) =>
                setPlaying((prev) => ({ ...prev, is_active: e.target.checked }))
              }
            />
            Playing active (`is_active`)
          </label>
          <Button onClick={() => void savePlaying()} disabled={!canWrite}>
            Save playing
          </Button>

          <div className="grid gap-3 border-t border-[var(--border)] pt-3 sm:grid-cols-2">
            <TextField
              label="Add challenge UUID to live roster"
              name="roster_chal"
              value={rosterChallengeId}
              onChange={(e) => setRosterChallengeId(e.target.value)}
            />
            <div className="flex items-end">
              <Button
                variant="secondary"
                disabled={!canWrite || !rosterChallengeId.trim()}
                onClick={() =>
                  void (async () => {
                    try {
                      await addPlayingChallenges(activeId, [
                        rosterChallengeId.trim(),
                      ]);
                      setRosterChallengeId("");
                      await load();
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : "Roster add failed",
                      );
                    }
                  })()
                }
              >
                Add challenge
              </Button>
            </div>
            <TextField
              label="Add team UUID to live roster"
              name="roster_team"
              value={rosterTeamId}
              onChange={(e) => setRosterTeamId(e.target.value)}
            />
            <div className="flex items-end">
              <Button
                variant="secondary"
                disabled={!canWrite || !rosterTeamId.trim()}
                onClick={() =>
                  void (async () => {
                    try {
                      await addPlayingTeams(activeId, [rosterTeamId.trim()]);
                      setRosterTeamId("");
                      await load();
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : "Roster add failed",
                      );
                    }
                  })()
                }
              >
                Add team
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">
                Live challenges ({playing.challenges?.length ?? 0})
              </p>
              <ul className="max-h-40 space-y-1 overflow-auto text-xs text-[var(--text)]">
                {(playing.challenges || []).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <span>{c.name || c.id}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void (async () => {
                          try {
                            await removePlayingChallenge(activeId, c.id);
                            await load();
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Remove failed",
                            );
                          }
                        })()
                      }
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">
                Live teams ({playing.teams?.length ?? 0})
              </p>
              <ul className="max-h-40 space-y-1 overflow-auto text-xs text-[var(--text)]">
                {(playing.teams || []).map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2">
                    <span>{t.name || t.id}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void (async () => {
                          try {
                            await removePlayingTeam(activeId, t.id);
                            await load();
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Remove failed",
                            );
                          }
                        })()
                      }
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {!isLoading && tab === "admins" && isRoot ? (
        <div className="space-y-4">
          <p className="text-xs text-[var(--text-muted)]">
            Root only — assign platform users as full organizers for this event.
          </p>
          <div className="grid gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-3">
            <TextField
              label="User UUID"
              name="admin_user"
              value={adminUser}
              onChange={(e) => setAdminUser(e.target.value)}
            />
            <TextField
              label="Notes (optional)"
              name="admin_notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
            <div className="flex items-end">
              <Button className="w-full" onClick={() => void onAssignAdmin()}>
                Assign admin
              </Button>
            </div>
          </div>
          <DataTable
            rows={admins}
            rowKey={(r) => r.id}
            emptyMessage="No hackathon admin bindings for this event."
            columns={[
              {
                key: "user",
                header: "User",
                render: (row) =>
                  row.user_detail?.username ||
                  row.user_detail?.email ||
                  row.user,
              },
              {
                key: "granted",
                header: "Granted",
                render: (row) => row.granted_at || "—",
              },
              {
                key: "active",
                header: "Active",
                render: (row) => (row.is_active === false ? "No" : "Yes"),
              },
              {
                key: "actions",
                header: "",
                className: "text-right",
                render: (row) => (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void onRevokeAdmin(row.id)}
                  >
                    Revoke
                  </Button>
                ),
              },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
