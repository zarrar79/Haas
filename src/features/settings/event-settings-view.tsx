"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { FormCheckbox } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/loader";
import { StickyToolbar } from "@/components/ui/sticky-toolbar";
import { TextField } from "@/components/ui/text-field";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import {
  assignHackathonAdmin,
  listHackathonAdmins,
  revokeHackathonAdmin,
  type HackathonAdminBinding,
} from "@/features/hackathon-admins/hackathon-admin-api";
import {
  getPlaying,
  getSettings,
  patchPlaying,
  patchSettings,
  type EventSettings,
  type ModeScheduleBlock,
  type ModeSchedulePatch,
  type PlayingModes,
  type PlayingState,
} from "@/features/settings/settings-api";
import { PlayingModeScheduleBoard } from "@/features/settings/playing-mode-schedule-board";
import {
  notifyPlayingScheduleChanged,
  onPlayingScheduleChanged,
} from "@/features/settings/playing-schedule-sync";
import {
  addPlayingChallenges,
  addPlayingTeams,
  removePlayingChallenge,
  removePlayingTeam,
} from "@/features/challenges/challenge-admin-api";
import { redirectIfUnauthorized } from "@/lib/client-api";

type Tab = "settings" | "playing" | "admins";

type Props = { hackathonId: string };

const DEFAULT_FLAG_FORMAT = "CYBERRANGE";

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true" || value === "True") {
    return true;
  }
  if (value === 0 || value === "0" || value === "false" || value === "False") {
    return false;
  }
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asString(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  const s = String(value).trim();
  return s || fallback;
}

function toIsoFromLocal(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

function modePatchFromBlock(
  block: ModeScheduleBlock | null | undefined,
): ModeSchedulePatch | undefined {
  if (!block) return undefined;
  return {
    enabled: block.enabled,
    isPaused: block.isPaused,
    isInfinite: block.isInfinite,
    start: block.start == null ? block.start : toIsoFromLocal(block.start) ?? block.start,
    end: block.end == null ? block.end : toIsoFromLocal(block.end) ?? block.end,
  };
}

export function EventSettingsView({ hackathonId }: Props) {
  const { confirm } = usePlatformDialog();
  const router = useRouter();
  const { canMutateEvent, isRoot } = useHaasAccess();
  const { setSelectedHackathonId } = useSelectedEvent();
  const [activeId, setActiveId] = useState(hackathonId);
  const [tab, setTab] = useState<Tab>("settings");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settings, setSettings] = useState<EventSettings>({});
  const [playing, setPlaying] = useState<PlayingState>({});
  const [admins, setAdmins] = useState<HackathonAdminBinding[]>([]);
  const [adminUser, setAdminUser] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [rosterChallengeId, setRosterChallengeId] = useState("");
  const [rosterTeamId, setRosterTeamId] = useState("");

  const canWrite = canMutateEvent(activeId);

  useEffect(() => {
    setActiveId(hackathonId);
    if (hackathonId) setSelectedHackathonId(hackathonId);
  }, [hackathonId, setSelectedHackathonId]);

  const load = useCallback(async () => {
    if (!activeId) return;
    setIsLoading(true);
    setError(null);
    try {
      const adminPromise = isRoot
        ? listHackathonAdmins({ hackathon: activeId })
        : Promise.resolve([] as HackathonAdminBinding[]);
      const [s, p, adminRows] = await Promise.all([
        getSettings(activeId),
        getPlaying(activeId),
        adminPromise,
      ]);
      setSettings(s || {});
      setPlaying(p || {});
      setAdmins(adminRows);
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }, [activeId, isRoot, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return onPlayingScheduleChanged((id) => {
      if (id !== activeId) return;
      void getPlaying(activeId)
        .then((p) => setPlaying(p || {}))
        .catch(() => undefined);
    });
  }, [activeId]);

  function setSetting<K extends string>(key: K, value: unknown) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function saveSettings() {
    setError(null);
    setInfo(null);
    setIsSavingSettings(true);
    try {
      const flagFormat = String(settings.flag_format ?? "").trim();
      if (!flagFormat) {
        setError("Flag format is required.");
        return;
      }
      const platformDefaults =
        settings.platform_defaults &&
        typeof settings.platform_defaults === "object"
          ? (settings.platform_defaults as Record<string, unknown>)
          : {};
      const defaultContainer = asNumber(
        platformDefaults.per_team_container_machine_limit,
        5,
      );
      const defaultVm = asNumber(
        platformDefaults.per_team_vm_machine_limit,
        1,
      );
      // Only patch fields that are actually used by the platform.
      const payload: EventSettings = {
        flag_format: flagFormat,
        first_blood_voice_enabled: asBool(
          settings.first_blood_voice_enabled,
          true,
        ),
        show_test_teams: asBool(settings.show_test_teams, false),
        per_team_container_machine_limit: asNumber(
          settings.per_team_container_machine_limit,
          defaultContainer,
        ),
        is_active_per_team_container_machine_limit: asBool(
          settings.is_active_per_team_container_machine_limit,
          true,
        ),
        per_team_vm_machine_limit: asNumber(
          settings.per_team_vm_machine_limit,
          defaultVm,
        ),
        is_active_per_team_vm_machine_limit: asBool(
          settings.is_active_per_team_vm_machine_limit,
          true,
        ),
      };
      const saved = await patchSettings(activeId, payload);
      setSettings(saved);
      setInfo("Hackathon settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSavingSettings(false);
    }
  }

  // Keep the raw value while editing so backspace can clear the field;
  // only fall back to the default for preview / save.
  const flagFormatInput =
    settings.flag_format == null ? DEFAULT_FLAG_FORMAT : String(settings.flag_format);
  const flagPreview = `${
    flagFormatInput.trim() || DEFAULT_FLAG_FORMAT
  }{a1b2c3…}`;

  async function savePlaying() {
    setError(null);
    try {
      const modes = playing.modes;
      const event = playing.event;
      setPlaying(
        await patchPlaying(activeId, {
          is_open: Boolean(playing.is_open),
          show_to_clients: Boolean(playing.show_to_clients),
          is_active: Boolean(playing.is_active),
          event: {
            start:
              event?.start == null
                ? event?.start
                : toIsoFromLocal(event.start) ?? event.start,
            end:
              event?.end == null
                ? event?.end
                : toIsoFromLocal(event.end) ?? event.end,
            isPaused: Boolean(event?.isPaused),
            isInfinite: Boolean(event?.isInfinite),
          },
          eventPaused: Boolean(event?.isPaused),
          ctf: modePatchFromBlock(modes?.ctf),
          koth: {
            ...(modePatchFromBlock(modes?.koth) ?? {}),
            ...(modes?.koth?.sessionId
              ? { sessionId: modes.koth.sessionId }
              : {}),
          },
          attackDefense: modePatchFromBlock(modes?.attackDefense),
        }),
      );
      notifyPlayingScheduleChanged(activeId);
      setInfo("Event + mode schedules saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save playing");
    }
  }

  function setPlayingMode(
    key: keyof PlayingModes,
    patch: Partial<ModeScheduleBlock>,
  ) {
    setPlaying((prev) => ({
      ...prev,
      modes: {
        ...prev.modes,
        [key]: { ...(prev.modes?.[key] ?? {}), ...patch },
      },
    }));
  }

  function setPlayingModeDatetime(
    key: keyof PlayingModes,
    field: "start" | "end",
    localValue: string,
  ) {
    const iso = localValue ? toIsoFromLocal(localValue) : null;
    setPlayingMode(key, { [field]: iso });
  }

  function setEventPatch(patch: Partial<NonNullable<PlayingState["event"]>>) {
    setPlaying((prev) => ({
      ...prev,
      event: { ...(prev.event ?? {}), ...patch },
    }));
  }

  function setEventDatetime(field: "start" | "end", localValue: string) {
    const iso = localValue ? toIsoFromLocal(localValue) : null;
    setEventPatch({ [field]: iso });
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
    const ok = await confirm({
      title: "Revoke admin",
      message: "Revoke this hackathon admin binding?",
      confirmLabel: "Revoke",
      destructive: true,
    });
    if (!ok) return;
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
    { id: "playing", label: "Playing" },
    ...(isRoot ? [{ id: "admins" as const, label: "Hackathon admins" }] : []),
  ];

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Event workspace"
        title="Hackathon · Event settings"
        description="Hackathon is the Event envelope. CTF / KOTH / A&D clocks live under Playing."
      />

      <StickyToolbar>
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
      </StickyToolbar>

      {error ? (
        <div className="mb-3">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}
      {info ? (
        <div className="mb-3">
          <Alert variant="success">{info}</Alert>
        </div>
      ) : null}

      {isLoading ? <PageLoader label="Loading settings…" variant="form" /> : null}

      {!isLoading && tab === "settings" ? (
        <div className="space-y-4">
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Flag format
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Prefix used for dynamically generated challenge flags. Default is{" "}
              <code className="text-[var(--text)]">{DEFAULT_FLAG_FORMAT}</code>.
              Spawned machines will use{" "}
              <code className="text-[var(--text)]">{`PREFIX{hash}`}</code>.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <TextField
                label="Flag prefix"
                name="flag_format"
                value={flagFormatInput}
                onChange={(e) => setSetting("flag_format", e.target.value)}
                disabled={!canWrite || isSavingSettings}
                placeholder={DEFAULT_FLAG_FORMAT}
              />
              <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Preview
                </p>
                <p className="mt-2 font-mono text-sm text-[var(--text)]">
                  {flagPreview}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
              First blood
            </h2>
            <p className="mb-3 text-sm text-[var(--text-muted)]">
              Controls the player-portal first-blood sound/voice for this event.
              Scoring uses the shared first-blood bonus, not attempt bonuses.
            </p>
            <FormCheckbox
              label="Play first-blood voice / sound for the solving team"
              checked={asBool(settings.first_blood_voice_enabled, true)}
              onChange={(checked) =>
                setSetting("first_blood_voice_enabled", checked)
              }
              disabled={!canWrite || isSavingSettings}
            />
          </div>

          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Public boards
            </h2>
            <p className="mb-3 text-sm text-[var(--text-muted)]">
              When off, teams marked testing or load-testing are hidden from
              leaderboard, scoreboard, KOTH, and live dashboards for this event.
            </p>
            <FormCheckbox
              label="Show test teams on public boards"
              checked={asBool(settings.show_test_teams, false)}
              onChange={(checked) => setSetting("show_test_teams", checked)}
              disabled={!canWrite || isSavingSettings}
            />
          </div>

          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Machine limits
            </h2>
      
        
            {(() => {
              const platformDefaults =
                settings.platform_defaults &&
                typeof settings.platform_defaults === "object"
                  ? (settings.platform_defaults as Record<string, unknown>)
                  : {};
              const defaultContainer = asNumber(
                platformDefaults.per_team_container_machine_limit,
                5,
              );
              const defaultVm = asNumber(
                platformDefaults.per_team_vm_machine_limit,
                1,
              );
              return (
                <>
                 
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      label="Container machines per team"
                      name="per_team_container_machine_limit"
                      type="number"
                      value={String(
                        asNumber(
                          settings.per_team_container_machine_limit,
                          defaultContainer,
                        ),
                      )}
                      onChange={(e) =>
                        setSetting(
                          "per_team_container_machine_limit",
                          Number(e.target.value),
                        )
                      }
                      disabled={!canWrite || isSavingSettings}
                    />
                    <TextField
                      label="VM machines per team"
                      name="per_team_vm_machine_limit"
                      type="number"
                      value={String(
                        asNumber(
                          settings.per_team_vm_machine_limit,
                          defaultVm,
                        ),
                      )}
                      onChange={(e) =>
                        setSetting(
                          "per_team_vm_machine_limit",
                          Number(e.target.value),
                        )
                      }
                      disabled={!canWrite || isSavingSettings}
                    />
                    <FormCheckbox
                      label="Enforce container machine limit"
                      checked={asBool(
                        settings.is_active_per_team_container_machine_limit,
                        true,
                      )}
                      onChange={(checked) =>
                        setSetting(
                          "is_active_per_team_container_machine_limit",
                          checked,
                        )
                      }
                      disabled={!canWrite || isSavingSettings}
                    />
                    <FormCheckbox
                      label="Enforce VM machine limit"
                      checked={asBool(
                        settings.is_active_per_team_vm_machine_limit,
                        true,
                      )}
                      onChange={(checked) =>
                        setSetting(
                          "is_active_per_team_vm_machine_limit",
                          checked,
                        )
                      }
                      disabled={!canWrite || isSavingSettings}
                    />
                  </div>
                </>
              );
            })()}
          </div>

          {canWrite ? (
            <Button
              onClick={() => void saveSettings()}
              disabled={isSavingSettings}
            >
              {isSavingSettings ? "Saving…" : "Save hackathon settings"}
            </Button>
          ) : (
            <Alert variant="info">
              You have read-only access to this event&apos;s settings.
            </Alert>
          )}
        </div>
      ) : null}

      {!isLoading && tab === "playing" ? (
        <div className="space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Playing · Event &amp; mode clocks
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Set the Hackathon Event window separately from CTF, KOTH, and
              Attack &amp; Defense. Mode play never uses Event start/end.
            </p>
          </div>
          <FormCheckbox
            label="Allow team create / join (`is_open`)"
            description="Players can create or join teams while this is on. Defaults to open before the event starts and auto-unchecks when the event starts."
            checked={Boolean(playing.is_open)}
            onChange={(checked) =>
              setPlaying((prev) => ({ ...prev, is_open: checked }))
            }
          />
          <FormCheckbox
            label="Show event to clients (`show_to_clients`)"
            description="List this event in the player Events catalog. Turn off to hide it from clients without deleting the event."
            checked={playing.show_to_clients !== false}
            onChange={(checked) =>
              setPlaying((prev) => ({ ...prev, show_to_clients: checked }))
            }
          />
          <FormCheckbox
            label="Playing active (`is_active`)"
            checked={Boolean(playing.is_active)}
            onChange={(checked) =>
              setPlaying((prev) => ({ ...prev, is_active: checked }))
            }
          />
          <Button onClick={() => void savePlaying()} disabled={!canWrite}>
            Save Event &amp; modes
          </Button>

          <PlayingModeScheduleBoard
            event={playing.event}
            modes={playing.modes}
            scheduleOrder={playing.scheduleOrder}
            canWrite={canWrite}
            visibleModes={["ctf", "koth"]}
            onEventChange={setEventPatch}
            onEventDatetimeChange={setEventDatetime}
            onModeChange={setPlayingMode}
            onModeDatetimeChange={setPlayingModeDatetime}
          />

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
                className: "text-right w-12",
                render: (row) => (
                  <RowActionsMenu
                    label="Admin actions"
                    items={[
                      {
                        id: "revoke",
                        label: "Revoke",
                        onClick: () => void onRevokeAdmin(row.id),
                        destructive: true,
                      },
                    ]}
                  />
                ),
              },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
