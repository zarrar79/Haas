"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { FormSelect } from "@/components/ui/form-fields";
import { ModalShell } from "@/components/ui/modal-shell";
import {
  ListPageStat,
  ListPageStats,
  ListPageStatsDot,
} from "@/components/ui/list-page-stats";
import { PageHeader } from "@/components/ui/page-header";
import {
  FilterSelect,
  FilterTextField,
  StickyToolbar,
} from "@/components/ui/sticky-toolbar";
import { TextField } from "@/components/ui/text-field";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import {
  computeEventEndDatetime,
  durationToSeconds,
  formatDurationLabel,
  playDurationMinutes,
  playSeconds,
  sumPauseSeconds,
} from "@/features/attack-defence/ad-timing";
import {
  CHALLENGE_TEAM_REQUIRED_MSG,
  ChallengeDeployProgressModal,
  ChallengeDetailPanel,
  CategoryDetailPanel,
  MachineDetailPanel,
  NamespacePicker,
  PauseDetailPanel,
  PlayingTeamDetailPanel,
  ServiceDetailPanel,
} from "@/features/attack-defence/ad-detail-panels";
import { AdEventRosterView } from "@/features/attack-defence/ad-event-roster-view";
import {
  buildAdEventSectionHref,
  type AdEventSectionId,
} from "@/features/attack-defence/ad-nav";
import {
  adEventLifecycle,
  createAdPause,
  createAdNamespace,
  createAdPlaying,
  createAdPlayingTeam,
  createAdService,
  createAdServiceCategory,
  deleteAdChallenge,
  deleteAdMachine,
  deleteAdNamespace,
  deleteAdPause,
  deleteAdService,
  deleteAdServiceCategory,
  getAdEvent,
  listAdChallenges,
  listAdEvents,
  listAdFlagSubmissions,
  listAdFlags,
  listAdMachines,
  listAdNamespaces,
  listAdPauses,
  listAdPlayingTeams,
  listAdPlayings,
  listAdRounds,
  listAdServiceCategories,
  listAdServices,
  spawnAdChallenge,
  spawnAdMachine,
  stopAdChallenge,
  stopAdMachine,
  updateAdEvent,
  updateAdNamespace,
  type AdChallenge,
  type AdEvent,
  type AdFlag,
  type AdFlagSubmission,
  type AdMachine,
  type AdNamespace,
  type AdPause,
  type AdPlaying,
  type AdPlayingTeam,
  type AdService,
  type AdServiceCategory,
  type AdUptimeCheck,
} from "@/features/attack-defence/attack-defence-api";
import {
  listPlatformTeams,
  type EventTeam,
} from "@/features/teams/team-api";
import { redirectIfUnauthorized } from "@/lib/client-api";
import { formatDate } from "@/lib/format";

type DetailState =
  | { kind: "challenge"; row: AdChallenge | null }
  | { kind: "category"; row: AdServiceCategory }
  | { kind: "machine"; row: AdMachine | null }
  | { kind: "service"; row: AdService }
  | { kind: "pause"; row: AdPause }
  | { kind: "playingTeam"; row: AdPlayingTeam }
  | null;

type TabId = AdEventSectionId;

const EMPTY_FILTERS = {
  q: "",
  type: "",
  status: "",
  challenge: "",
  category: "",
  protocol: "",
  tier: "",
  active: "",
  captured: "",
  valid: "",
  slot: "",
  round: "",
  team: "",
  open: "",
  yaml: "",
  machine: "",
};

type TabFilters = typeof EMPTY_FILTERS;

function matchesQuery(haystack: string, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return haystack.toLowerCase().includes(needle);
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((v) => (v || "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

type Props = {
  eventId: string;
  initialSection?: AdEventSectionId;
};

export function AdEventDetailView({
  eventId,
  initialSection = "overview",
}: Props) {
  const router = useRouter();
  const { prompt, confirm } = usePlatformDialog();
  const { isPlatformOperator } = useHaasAccess();
  const canWrite = isPlatformOperator;

  const [tab, setTab] = useState<TabId>(initialSection);

  useEffect(() => {
    setTab(initialSection);
  }, [initialSection]);
  const [event, setEvent] = useState<AdEvent | null>(null);
  const [pauses, setPauses] = useState<AdPause[]>([]);
  const [challenges, setChallenges] = useState<AdChallenge[]>([]);
  const [categories, setCategories] = useState<AdServiceCategory[]>([]);
  const [namespaces, setNamespaces] = useState<AdNamespace[]>([]);
  const [machines, setMachines] = useState<AdMachine[]>([]);
  const [services, setServices] = useState<AdService[]>([]);
  const [flags, setFlags] = useState<AdFlag[]>([]);
  const [playings, setPlayings] = useState<AdPlaying[]>([]);
  const [playingTeams, setPlayingTeams] = useState<AdPlayingTeam[]>([]);
  const [platformTeams, setPlatformTeams] = useState<EventTeam[]>([]);
  const [submissions, setSubmissions] = useState<AdFlagSubmission[]>([]);
  const [uptime, setUptime] = useState<AdUptimeCheck[]>([]);
  const [rounds, setRounds] = useState<{ id: string; round_number: number }[]>(
    [],
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [globalNamespace, setGlobalNamespace] = useState("");
  const [namespaceOptions, setNamespaceOptions] = useState<string[]>([]);
  const [totalRounds, setTotalRounds] = useState(10);
  const [roundDurationSec, setRoundDurationSec] = useState(720);
  const [uptimeInterval, setUptimeInterval] = useState(3);
  const [startDatetime, setStartDatetime] = useState("");
  const [status, setStatus] = useState("draft");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState>(null);
  const [filters, setFilters] = useState<TabFilters>(EMPTY_FILTERS);
  const [highlightChallengeId, setHighlightChallengeId] = useState<
    string | null
  >(null);
  const [yamlViewer, setYamlViewer] = useState<{
    title: string;
    content: string;
  } | null>(null);
  const [deployProgress, setDeployProgress] = useState<{
    challengeName: string;
    teamName: string;
    error?: string | null;
    mode?: "deploy" | "stop";
  } | null>(null);

  const teamNameForChallenge = useCallback(
    (challengeId: string) => {
      const pt = playingTeams.find((p) => p.challenge === challengeId);
      return (pt?.team_name || "").trim() || "Unassigned";
    },
    [playingTeams],
  );

  const isChallengeAssignedToTeam = useCallback(
    (challengeId: string) =>
      playingTeams.some((p) => p.challenge === challengeId),
    [playingTeams],
  );

  const setFilter = useCallback(
    <K extends keyof TabFilters>(key: K, value: TabFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((v) => v.trim() !== ""),
    [filters],
  );

  useEffect(() => {
    setFilters(EMPTY_FILTERS);
  }, [tab]);

  useEffect(() => {
    if (!highlightChallengeId || tab !== "challenges") return;
    const timer = window.setTimeout(() => setHighlightChallengeId(null), 2200);
    return () => window.clearTimeout(timer);
  }, [highlightChallengeId, tab]);

  const goToChallengeFromPlayingTeam = useCallback(
    (pt: AdPlayingTeam) => {
      const challengeId = pt.challenge;
      if (!challengeId) return;
      clearFilters();
      setHighlightChallengeId(challengeId);
      router.push(buildAdEventSectionHref(eventId, "challenges"));
    },
    [clearFilters, eventId, router],
  );

  const refreshNamespaceOptions = useCallback(async () => {
    const [nsRows, eventRows, runningRows] = await Promise.all([
      listAdNamespaces({ is_active: "true" }),
      listAdEvents({ is_active: "true" }),
      listAdEvents({ status: "running", is_active: "true" }),
    ]);
    const names = new Set<string>();
    for (const ns of nsRows) {
      if (ns.name?.trim()) names.add(ns.name.trim());
    }
    for (const ev of [...runningRows, ...eventRows]) {
      const n = (ev.global_namespace || "").trim();
      if (n) names.add(n);
    }
    setNamespaceOptions(Array.from(names).sort((a, b) => a.localeCompare(b)));
  }, []);

  const loadRoster = useCallback(async () => {
    const [ps, chs, teams] = await Promise.all([
      listAdPlayings({ event: eventId }),
      listAdChallenges(),
      listPlatformTeams({ is_active: "true" }),
    ]);
    setPlayings(ps);
    setChallenges(chs);
    setPlatformTeams(teams);
    const teamLists = await Promise.all(
      ps.map((p) => listAdPlayingTeams({ ad_playing: p.id })),
    );
    setPlayingTeams(teamLists.flat());
  }, [eventId]);

  const loadCore = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ev, pauseRows] = await Promise.all([
        getAdEvent(eventId),
        listAdPauses(eventId),
      ]);
      setEvent(ev);
      setPauses(pauseRows);
      setName(ev.name);
      setDescription(ev.description || "");
      setGlobalNamespace(ev.global_namespace || "");
      setTotalRounds(ev.total_rounds);
      setRoundDurationSec(ev.round_duration_sec);
      setUptimeInterval(ev.uptime_check_interval_sec ?? 3);
      await refreshNamespaceOptions();
      await loadRoster();
      setStartDatetime(toDatetimeLocal(ev.start_datetime));
      setStatus(String(ev.status));
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Failed to load event");
    } finally {
      setIsLoading(false);
    }
  }, [eventId, router, refreshNamespaceOptions, loadRoster]);

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

  const loadTab = useCallback(async () => {
    setError(null);
    try {
      if (tab === "challenges") {
        const [chs, cats] = await Promise.all([
          listAdChallenges(),
          listAdServiceCategories(),
        ]);
        setChallenges(chs);
        setCategories(cats);
      } else if (tab === "categories") {
        setCategories(await listAdServiceCategories());
      } else if (tab === "namespaces") {
        setNamespaces(await listAdNamespaces());
        await refreshNamespaceOptions();
      } else if (tab === "machines") {
        const [ms, chs] = await Promise.all([
          listAdMachines(),
          listAdChallenges(),
        ]);
        setMachines(ms);
        setChallenges(chs);
      } else if (tab === "services") {
        const [svcs, chs, cats] = await Promise.all([
          listAdServices(),
          listAdChallenges(),
          listAdServiceCategories(),
        ]);
        setServices(svcs);
        setChallenges(chs);
        setCategories(cats);
      } else if (tab === "flags") {
        const [ps, chs, flagRows, svcRows, machineRows] = await Promise.all([
          listAdPlayings({ event: eventId }),
          listAdChallenges(),
          listAdFlags(),
          listAdServices(),
          listAdMachines(),
        ]);
        setPlayings(ps);
        setChallenges(chs);
        setFlags(flagRows);
        setServices(svcRows);
        setMachines(machineRows);
        const roundLists = await Promise.all(
          ps.map((p) => listAdRounds({ ad_playing: p.id })),
        );
        setRounds(
          roundLists.flat().map((r) => ({
            id: r.id,
            round_number: r.round_number,
          })),
        );
      } else if (tab === "playings") {
        const ps = await listAdPlayings({ event: eventId });
        setPlayings(ps);
        const teams = (
          await Promise.all(
            ps.map((p) => listAdPlayingTeams({ ad_playing: p.id })),
          )
        ).flat();
        setPlayingTeams(teams);
        setChallenges(await listAdChallenges());
        setMachines(await listAdMachines());
      } else if (tab === "submissions") {
        const [subs, ps] = await Promise.all([
          listAdFlagSubmissions(),
          listAdPlayings({ event: eventId }),
        ]);
        setSubmissions(subs);
        setPlayings(ps);
        const teams = (
          await Promise.all(
            ps.map((p) => listAdPlayingTeams({ ad_playing: p.id })),
          )
        ).flat();
        setPlayingTeams(teams);
        setServices(await listAdServices());
      } else if (tab === "uptime") {
        // Uptime tab stays empty until scorer wiring is ready.
        setUptime([]);
        const [ps, svcs] = await Promise.all([
          listAdPlayings({ event: eventId }),
          listAdServices(),
        ]);
        setPlayings(ps);
        setServices(svcs);
        const teams = (
          await Promise.all(
            ps.map((p) => listAdPlayingTeams({ ad_playing: p.id })),
          )
        ).flat();
        setPlayingTeams(teams);
      } else if (tab === "pauses") {
        setPauses(await listAdPauses(eventId));
      } else if (tab === "matchups") {
        await loadRoster();
      }
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Failed to load tab data");
    }
  }, [tab, eventId, router, refreshNamespaceOptions, loadRoster]);

  useEffect(() => {
    if (tab !== "overview") void loadTab();
  }, [tab, loadTab]);

  const previewEnd = useMemo(
    () =>
      computeEventEndDatetime({
        startDatetime: fromDatetimeLocal(startDatetime),
        totalRounds,
        roundDurationSec,
        pauses,
      }),
    [startDatetime, totalRounds, roundDurationSec, pauses],
  );

  const playSecs = playSeconds(totalRounds, roundDurationSec);
  const pauseSecs = sumPauseSeconds(pauses);
  const playMins = playDurationMinutes(totalRounds, roundDurationSec);

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const pt of playingTeams) {
      if (pt.team) map.set(pt.team, pt.team_name || pt.team.slice(0, 8));
      map.set(pt.id, pt.team_name || pt.team.slice(0, 8));
    }
    return map;
  }, [playingTeams]);

  const serviceLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of services) {
      map.set(
        s.id,
        `${s.slot} ${s.name}${s.challenge_name ? ` · ${s.challenge_name}` : ""}`.trim(),
      );
    }
    return map;
  }, [services]);

  const challengeOptions = useMemo(
    () =>
      [...challenges]
        .map((c) => ({ id: c.id, name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [challenges],
  );

  const categoryOptions = useMemo(
    () =>
      [...categories]
        .map((c) => ({ id: c.id, name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );

  const machineStatusOptions = useMemo(
    () => uniqueSorted(machines.map((m) => m.status)),
    [machines],
  );

  const serviceStatusOptions = useMemo(
    () => uniqueSorted(services.map((s) => s.service_status)),
    [services],
  );

  const pauseStatusOptions = useMemo(
    () => uniqueSorted(pauses.map((p) => p.status)),
    [pauses],
  );

  const slotOptions = useMemo(
    () =>
      uniqueSorted([
        ...services.map((s) => s.slot),
        ...flags.map((f) => f.service_slot),
      ]),
    [services, flags],
  );

  const roundOptions = useMemo(
    () =>
      [...rounds]
        .sort((a, b) => a.round_number - b.round_number)
        .map((r) => ({ id: r.id, label: `Round ${r.round_number}` })),
    [rounds],
  );

  const uptimeStatusOptions = useMemo(
    () => uniqueSorted(uptime.map((u) => u.service_status)),
    [uptime],
  );

  const filteredPauses = useMemo(() => {
    return pauses.filter((p) => {
      if (filters.type && p.type !== filters.type) return false;
      if (filters.status && p.status !== filters.status) return false;
      return matchesQuery(
        `${p.type} ${p.status} ${p.after_round ?? ""} ${p.duration ?? ""}`,
        filters.q,
      );
    });
  }, [pauses, filters]);

  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      if (filters.active === "yes" && c.is_active === false) return false;
      if (filters.active === "no" && c.is_active !== false) return false;
      if (filters.yaml === "set" && !(c.yaml_manifest || "").trim()) return false;
      if (filters.yaml === "empty" && (c.yaml_manifest || "").trim()) return false;
      return matchesQuery(
        `${c.name} ${c.description || ""}`,
        filters.q,
      );
    });
  }, [challenges, filters]);

  const filteredNamespaces = useMemo(() => {
    return namespaces.filter((n) => {
      if (filters.active === "yes" && n.is_active === false) return false;
      if (filters.active === "no" && n.is_active !== false) return false;
      if (filters.status && (n.status || "") !== filters.status) return false;
      return matchesQuery(
        `${n.name} ${n.ip_pool || ""} ${n.status || ""}`,
        filters.q,
      );
    });
  }, [namespaces, filters]);

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      if (filters.protocol && (c.protocol || "tcp") !== filters.protocol)
        return false;
      if (filters.tier && (c.tier || "") !== filters.tier) return false;
      if (filters.active === "yes" && c.is_active === false) return false;
      if (filters.active === "no" && c.is_active !== false) return false;
      return matchesQuery(
        `${c.name} ${c.protocol || ""} ${c.tier || ""} ${c.default_port}`,
        filters.q,
      );
    });
  }, [categories, filters]);

  const filteredMachines = useMemo(() => {
    return machines.filter((m) => {
      if (filters.challenge && m.challenge !== filters.challenge) return false;
      if (filters.status && (m.status || "") !== filters.status) return false;
      if (
        filters.team &&
        (m.team_name || "").toLowerCase() !== filters.team.toLowerCase()
      )
        return false;
      return matchesQuery(
        `${m.vm_name || ""} ${m.hostname || ""} ${m.ip_address || ""} ${m.team_name || ""} ${m.challenge_name || ""} ${m.status || ""}`,
        filters.q,
      );
    });
  }, [machines, filters]);

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      if (filters.challenge && s.challenge !== filters.challenge) return false;
      if (filters.category && s.category !== filters.category) return false;
      if (filters.slot && s.slot !== filters.slot) return false;
      if (
        filters.status &&
        (s.service_status || "unknown") !== filters.status
      )
        return false;
      return matchesQuery(
        `${s.slot} ${s.name} ${s.challenge_name || ""} ${s.category_name || ""} ${s.service_status || ""}`,
        filters.q,
      );
    });
  }, [services, filters]);

  const filteredFlags = useMemo(() => {
    return flags.filter((f) => {
      if (filters.challenge && f.challenge_id !== filters.challenge)
        return false;
      if (filters.round && f.round !== filters.round) return false;
      if (filters.slot && (f.service_slot || "") !== filters.slot) return false;
      if (filters.active === "yes" && !f.is_active) return false;
      if (filters.active === "no" && f.is_active) return false;
      if (filters.captured === "yes" && !f.is_captured) return false;
      if (filters.captured === "no" && f.is_captured) return false;
      return matchesQuery(
        `${f.flag} ${f.service_slot || ""} ${f.service_name || ""} ${f.challenge_name || ""} ${f.machine_ip || ""} ${f.round_number ?? ""}`,
        filters.q,
      );
    });
  }, [flags, filters]);

  const filteredPlayingTeams = useMemo(() => {
    return playingTeams.filter((pt) => {
      if (filters.challenge && pt.challenge !== filters.challenge) return false;
      if (filters.active === "yes" && pt.is_active === false) return false;
      if (filters.active === "no" && pt.is_active !== false) return false;
      if (filters.machine === "yes" && !pt.machine_ip && !pt.machine_id)
        return false;
      if (filters.machine === "no" && (pt.machine_ip || pt.machine_id))
        return false;
      return matchesQuery(
        `${pt.team_name || ""} ${pt.team_code || ""} ${pt.challenge_name || ""} ${pt.machine_ip || ""} ${pt.team}`,
        filters.q,
      );
    });
  }, [playingTeams, filters]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      if (filters.valid === "yes" && !s.is_valid) return false;
      if (filters.valid === "no" && s.is_valid) return false;
      if (filters.team) {
        if (
          s.attacker_team !== filters.team &&
          s.defender_team !== filters.team
        )
          return false;
      }
      const atk =
        teamNameById.get(s.attacker_team) ||
        s.attacker_team?.slice(0, 8) ||
        "";
      const def =
        teamNameById.get(s.defender_team) ||
        s.defender_team?.slice(0, 8) ||
        "";
      return matchesQuery(
        `${atk} ${def} ${s.attacker_team || ""} ${s.defender_team || ""} ${s.attack_score ?? ""}`,
        filters.q,
      );
    });
  }, [submissions, filters, teamNameById]);

  const filteredUptime = useMemo(() => {
    // Always empty for now — do not render incomplete uptime rows.
    return [] as AdUptimeCheck[];
  }, []);

  const saveOverview = async () => {
    if (!canWrite) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const wasEnded = status === "ended";
      const updated = await updateAdEvent(eventId, {
        name: name.trim() || "AD Event",
        description,
        global_namespace: globalNamespace.trim() || undefined,
        total_rounds: totalRounds,
        round_duration_sec: roundDurationSec,
        uptime_check_interval_sec: uptimeInterval,
        start_datetime: fromDatetimeLocal(startDatetime),
        status,
      });
      setEvent(updated);
      setStatus(updated.status || status);
      setGlobalNamespace(updated.global_namespace || "");
      setStartDatetime(toDatetimeLocal(updated.start_datetime));
      const reopened =
        wasEnded && updated.status === "running";
      setMessage(
        reopened
          ? "Event saved and reopened — end time extended past now."
          : "Event saved. End time recomputed on server.",
      );
      await loadCore();
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const runLifecycle = async (action: string) => {
    if (!canWrite) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await adEventLifecycle(eventId, action);
      setMessage(`Action “${action}” completed.`);
      await loadCore();
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : `${action} failed`);
    } finally {
      setBusy(false);
    }
  };

  const confirmAndDelete = async (opts: {
    title: string;
    message: string;
    successMessage: string;
    run: () => Promise<void>;
    refresh?: "core" | "tab";
  }) => {
    if (!canWrite) return;
    const ok = await confirm({
      title: opts.title,
      message: opts.message,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await opts.run();
      setMessage(opts.successMessage);
      setDetail(null);
      if (opts.refresh === "core") await loadCore();
      else await loadTab();
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const addScheduledPause = async () => {
    if (!canWrite) return;
    const after = await prompt({
      title: "After round",
      message: "Pause after this round number.",
      label: "After round",
      defaultValue: "1",
      confirmLabel: "Next",
    });
    if (after == null) return;
    const secs = await prompt({
      title: "Pause duration (seconds)",
      message: "Outside the play window — extends wall-clock end only.",
      label: "Seconds",
      defaultValue: "300",
      confirmLabel: "Create pause",
    });
    if (secs == null) return;
    setBusy(true);
    try {
      const afterRound = Number(after);
      const durationSec = Math.max(0, Number(secs) || 0);
      const body: {
        duration_sec: number;
        after_round?: number;
        start_time?: string;
      } = { duration_sec: durationSec };
      if (Number.isFinite(afterRound) && afterRound > 0) {
        body.after_round = afterRound;
        const startIso = fromDatetimeLocal(startDatetime);
        if (startIso) {
          body.start_time = new Date(
            new Date(startIso).getTime() + afterRound * roundDurationSec * 1000,
          ).toISOString();
        }
      } else if (fromDatetimeLocal(startDatetime)) {
        body.start_time = fromDatetimeLocal(startDatetime)!;
      }
      await createAdPause(eventId, body);
      await loadCore();
      setMessage("Pause created; event end recalculated.");
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Pause create failed");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading && !event) {
    return <p className="text-sm text-[var(--text-muted)]">Loading…</p>;
  }

  return (
    <div className="w-full space-y-4">
      <PageHeader title={event?.name || "AD Event"} />

      {error ? <Alert variant="error">{error}</Alert> : null}
      {message ? <Alert variant="success">{message}</Alert> : null}

      {tab === "overview" ? (
        <div className="grid max-w-3xl gap-3">
          {canWrite ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => void runLifecycle("readiness")}
              >
                Check readiness
              </Button>
              {status === "draft" || status === "scheduled" ? (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => void runLifecycle("start")}
                >
                  Start
                </Button>
              ) : null}
              {status === "running" ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void runLifecycle("pause")}
                >
                  Pause
                </Button>
              ) : null}
              {status === "paused" ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void runLifecycle("resume")}
                >
                  Resume
                </Button>
              ) : null}
              {status === "running" || status === "paused" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void runLifecycle("stop")}
                >
                  Stop
                </Button>
              ) : null}
              {status === "ended" ? (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => void runLifecycle("reopen")}
                >
                  Reopen
                </Button>
              ) : null}
            </div>
          ) : null}
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canWrite}
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canWrite}
          />
          <NamespacePicker
            label="Global namespace"
            value={globalNamespace}
            options={namespaceOptions}
            disabled={!canWrite}
            onChange={setGlobalNamespace}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Total rounds"
              type="number"
              value={String(totalRounds)}
              onChange={(e) => setTotalRounds(Number(e.target.value) || 0)}
              disabled={!canWrite}
            />
            <TextField
              label="Round duration (sec)"
              type="number"
              value={String(roundDurationSec)}
              onChange={(e) =>
                setRoundDurationSec(Number(e.target.value) || 0)
              }
              disabled={!canWrite}
            />
            <TextField
              label="Uptime check interval (sec)"
              type="number"
              value={String(uptimeInterval)}
              onChange={(e) => setUptimeInterval(Number(e.target.value) || 0)}
              disabled={!canWrite}
            />
            <FormSelect
              label="Status"
              value={status}
              onChange={setStatus}
              disabled={
                !canWrite ||
                status === "running" ||
                status === "paused" ||
                status === "ended"
              }
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="running">Running</option>
              <option value="paused">Paused</option>
              <option value="ended">Ended</option>
            </FormSelect>
          </div>
          <TextField
            label="Start time"
            type="datetime-local"
            value={startDatetime}
            onChange={(e) => setStartDatetime(e.target.value)}
            disabled={!canWrite || status === "ended"}
          />
          <TextField
            label="End time (readonly)"
            type="datetime-local"
            value={toDatetimeLocal(previewEnd || event?.end_datetime)}
            readOnly
            disabled
          />
          <p className="text-sm text-[var(--text-muted)]">
            Play window: {formatDurationLabel(playSecs)}
            {playMins != null ? ` (${playMins} min)` : ""} — pauses are not
            inside this. Wall-clock adds {formatDurationLabel(pauseSecs)} from{" "}
            {pauses.length} pause(s). Mid-round runtime pause extends end on
            resume. You can raise rounds or duration while running; after
            ended, saving a later end time reopens the event automatically
            (or use Reopen).
          </p>
          {canWrite ? (
            <Button disabled={busy} onClick={() => void saveOverview()}>
              Save event
            </Button>
          ) : null}
        </div>
      ) : null}

      {tab === "pauses" ? (
        <div className="space-y-3">
          <AdTabFilterBar
            total={pauses.length}
            shown={filteredPauses.length}
            hasFilters={hasActiveFilters}
            onClear={clearFilters}
            actions={
              canWrite ? (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => void addScheduledPause()}
                >
                  Add scheduled pause
                </Button>
              ) : null
            }
          >
            <FilterTextField
              label="Search"
              value={filters.q}
              onChange={(v) => setFilter("q", v)}
              placeholder="Type, status, round…"
            />
            <FilterSelect
              label="Type"
              value={filters.type}
              onChange={(v) => setFilter("type", v)}
            >
              <option value="">All types</option>
              <option value="scheduled">Scheduled</option>
              <option value="runtime">Runtime</option>
            </FilterSelect>
            <FilterSelect
              label="Status"
              value={filters.status}
              onChange={(v) => setFilter("status", v)}
            >
              <option value="">All statuses</option>
              {pauseStatusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </FilterSelect>
          </AdTabFilterBar>
          <DataTable
            rows={filteredPauses}
            rowKey={(r) => r.id}
            emptyMessage="No pauses."
            columns={withSerialColumn(filteredPauses, [
              { key: "type", header: "Type", render: (r) => r.type },
              { key: "status", header: "Status", render: (r) => r.status },
              {
                key: "after",
                header: "After round",
                render: (r) => String(r.after_round ?? "—"),
              },
              {
                key: "dur",
                header: "Duration",
                render: (r) =>
                  formatDurationLabel(
                    Number(r.duration_seconds) ||
                      durationToSeconds(r.duration) ||
                      0,
                  ),
              },
              {
                key: "window",
                header: "Start → end",
                render: (r) =>
                  `${r.start_time ? formatDate(r.start_time) : "—"} → ${
                    r.end_time ? formatDate(r.end_time) : "—"
                  }`,
              },
              {
                key: "actions",
                header: "",
                sticky: "right",
                render: (r) => (
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setDetail({ kind: "pause", row: r })}
                    >
                      View
                    </Button>
                    {canWrite && r.type !== "runtime" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          void confirmAndDelete({
                            title: "Delete pause?",
                            message:
                              "Event end time will be recalculated after this pause is removed.",
                            successMessage: "Pause deleted; event end recalculated.",
                            refresh: "core",
                            run: async () => {
                              await deleteAdPause(eventId, r.id);
                            },
                          })
                        }
                      >
                        Delete
                      </Button>
                    ) : null}
                  </div>
                ),
              },
            ])}
          />
        </div>
      ) : null}

      {tab === "challenges" ? (
        <ResourceTable
          canWrite={canWrite}
          busy={busy}
          rows={filteredChallenges}
          empty="No AD challenges."
          createLabel="Create challenge"
          focusRowKey={highlightChallengeId}
          highlightedRowKey={highlightChallengeId}
          onCreate={async () => {
            if (!categories.length) {
              setCategories(await listAdServiceCategories());
            }
            setDetail({ kind: "challenge", row: null });
          }}
          toolbar={
            <AdTabFilterBar
              total={challenges.length}
              shown={filteredChallenges.length}
              hasFilters={hasActiveFilters}
              onClear={clearFilters}
              actions={
                canWrite ? (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void (async () => {
                        if (!categories.length) {
                          setCategories(await listAdServiceCategories());
                        }
                        setDetail({ kind: "challenge", row: null });
                      })()
                    }
                  >
                    Create challenge
                  </Button>
                ) : null
              }
            >
              <FilterTextField
                label="Search"
                value={filters.q}
                onChange={(v) => setFilter("q", v)}
                placeholder="Name, description…"
              />
              <FilterSelect
                label="YAML"
                value={filters.yaml}
                onChange={(v) => setFilter("yaml", v)}
              >
                <option value="">All</option>
                <option value="set">Manifest set</option>
                <option value="empty">No manifest</option>
              </FilterSelect>
              <FilterSelect
                label="Active"
                value={filters.active}
                onChange={(v) => setFilter("active", v)}
              >
                <option value="">All</option>
                <option value="yes">Active</option>
                <option value="no">Inactive</option>
              </FilterSelect>
            </AdTabFilterBar>
          }
          columns={[
            { key: "name", header: "Name", render: (r) => r.name },
            {
              key: "pts",
              header: "Base points",
              render: (r) => String(r.base_points ?? 0),
            },
            {
              key: "services",
              header: "Services",
              render: (r) => String(r.service_count ?? 0),
            },
            {
              key: "vm_ip",
              header: "VM IP",
              render: (r) => r.machine_ip || "—",
            },
            {
              key: "yaml",
              header: "YAML",
              render: (r) =>
                (r.yaml_manifest || "").trim() ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setYamlViewer({
                        title: `${r.name} · YAML`,
                        content: r.yaml_manifest || "",
                      })
                    }
                  >
                    View YAML
                  </Button>
                ) : (
                  "—"
                ),
            },
            {
              key: "actions",
              header: "",
              sticky: "right",
              render: (r) => {
                const deployed =
                  r.machine_status === "running" ||
                  r.machine_status === "deploying";
                return (
                <div className="flex justify-end gap-2">
                  {canWrite ? (
                    deployed ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        title="Stop challenge VM"
                        onClick={() =>
                          void (async () => {
                            setBusy(true);
                            setError(null);
                            setMessage(null);
                            setDeployProgress({
                              challengeName: r.name,
                              teamName: teamNameForChallenge(r.id),
                              mode: "stop",
                            });
                            try {
                              const result = await stopAdChallenge(r.id);
                              const ok = result.stopped?.length ?? 0;
                              const fail = result.errors?.length ?? 0;
                              setMessage(
                                `Stopped ${r.name}: ${ok} machine(s)` +
                                  (fail ? `, ${fail} failed` : ""),
                              );
                              await loadTab();
                            } catch (err) {
                              if (redirectIfUnauthorized(err, router)) return;
                              setError(
                                err instanceof Error
                                  ? err.message
                                  : "Stop failed",
                              );
                            } finally {
                              setDeployProgress(null);
                              setBusy(false);
                            }
                          })()
                        }
                      >
                        Stop
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={
                          busy || !(r.yaml_manifest || "").trim()
                        }
                        title={
                          (r.yaml_manifest || "").trim()
                            ? "Deploy challenge VM from YAML"
                            : "Upload challenge YAML first"
                        }
                        onClick={() =>
                          void (async () => {
                            setBusy(true);
                            setError(null);
                            setMessage(null);
                            const teamLabel = teamNameForChallenge(r.id);
                            setDeployProgress({
                              challengeName: r.name,
                              teamName: teamLabel,
                              error: null,
                              mode: "deploy",
                            });
                            if (!isChallengeAssignedToTeam(r.id)) {
                              setDeployProgress({
                                challengeName: r.name,
                                teamName: teamLabel,
                                error: CHALLENGE_TEAM_REQUIRED_MSG,
                                mode: "deploy",
                              });
                              await new Promise((res) =>
                                setTimeout(res, 2500),
                              );
                              setDeployProgress(null);
                              setBusy(false);
                              return;
                            }
                            try {
                              const result = await spawnAdChallenge(r.id);
                              const ok = result.spawned?.length ?? 0;
                              const fail = result.errors?.length ?? 0;
                              const firstErr = result.errors?.[0]?.error || "";
                              if (
                                fail &&
                                firstErr
                                  .toLowerCase()
                                  .includes("assigned to a team")
                              ) {
                                setDeployProgress({
                                  challengeName: r.name,
                                  teamName: teamLabel,
                                  error: firstErr || CHALLENGE_TEAM_REQUIRED_MSG,
                                });
                                await new Promise((res) =>
                                  setTimeout(res, 2500),
                                );
                              } else {
                                setMessage(
                                  `Deployed ${r.name}: ${ok} machine(s)` +
                                    (fail ? `, ${fail} failed` : ""),
                                );
                              }
                              await loadTab();
                            } catch (err) {
                              if (redirectIfUnauthorized(err, router)) return;
                              const msg =
                                err instanceof Error
                                  ? err.message
                                  : "Deploy failed";
                              if (
                                msg.toLowerCase().includes("assigned to a team")
                              ) {
                                setDeployProgress({
                                  challengeName: r.name,
                                  teamName: teamLabel,
                                  error: msg,
                                });
                                await new Promise((res) =>
                                  setTimeout(res, 2500),
                                );
                              } else {
                                setError(msg);
                              }
                            } finally {
                              setDeployProgress(null);
                              setBusy(false);
                            }
                          })()
                        }
                      >
                        Deploy
                      </Button>
                    )
                  ) : null}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setDetail({ kind: "challenge", row: r })}
                  >
                    View
                  </Button>
                  {canWrite ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void confirmAndDelete({
                          title: "Delete challenge?",
                          message:
                            "This removes the challenge and its services. Linked machines may block delete.",
                          successMessage: "Challenge deleted.",
                          run: async () => {
                            await deleteAdChallenge(r.id);
                          },
                        })
                      }
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
                );
              },
            },
          ]}
        />
      ) : null}

      {tab === "categories" ? (
        <ResourceTable
          canWrite={canWrite}
          busy={busy}
          rows={filteredCategories}
          empty="No service categories."
          onCreate={async () => {
            const n = await prompt({
              title: "Category name",
              label: "Name",
              defaultValue: "SSH",
              confirmLabel: "Next",
            });
            if (!n) return;
            const port = await prompt({
              title: "Default port",
              label: "Port",
              defaultValue: "22",
              confirmLabel: "Create",
            });
            if (!port) return;
            setBusy(true);
            try {
              await createAdServiceCategory({
                name: n.trim(),
                default_port: Number(port) || 22,
              });
              await loadTab();
            } finally {
              setBusy(false);
            }
          }}
          toolbar={
            <AdTabFilterBar
              total={categories.length}
              shown={filteredCategories.length}
              hasFilters={hasActiveFilters}
              onClear={clearFilters}
              actions={
                canWrite ? (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void (async () => {
                        const n = await prompt({
                          title: "Category name",
                          label: "Name",
                          defaultValue: "SSH",
                          confirmLabel: "Next",
                        });
                        if (!n) return;
                        const port = await prompt({
                          title: "Default port",
                          label: "Port",
                          defaultValue: "22",
                          confirmLabel: "Create",
                        });
                        if (!port) return;
                        setBusy(true);
                        try {
                          await createAdServiceCategory({
                            name: n.trim(),
                            default_port: Number(port) || 22,
                          });
                          await loadTab();
                        } finally {
                          setBusy(false);
                        }
                      })()
                    }
                  >
                    Create
                  </Button>
                ) : null
              }
            >
              <FilterTextField
                label="Search"
                value={filters.q}
                onChange={(v) => setFilter("q", v)}
                placeholder="Name, protocol, port…"
              />
              <FilterSelect
                label="Protocol"
                value={filters.protocol}
                onChange={(v) => setFilter("protocol", v)}
              >
                <option value="">All</option>
                {uniqueSorted(categories.map((c) => c.protocol || "tcp")).map(
                  (p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ),
                )}
              </FilterSelect>
              <FilterSelect
                label="Tier"
                value={filters.tier}
                onChange={(v) => setFilter("tier", v)}
              >
                <option value="">All</option>
                {uniqueSorted(categories.map((c) => c.tier)).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                label="Active"
                value={filters.active}
                onChange={(v) => setFilter("active", v)}
              >
                <option value="">All</option>
                <option value="yes">Active</option>
                <option value="no">Inactive</option>
              </FilterSelect>
            </AdTabFilterBar>
          }
          columns={[
            { key: "name", header: "Name", render: (r) => r.name },
            {
              key: "port",
              header: "Port",
              render: (r) => String(r.default_port),
            },
            {
              key: "proto",
              header: "Protocol",
              render: (r) => r.protocol || "tcp",
            },
            {
              key: "tier",
              header: "Tier",
              render: (r) => r.tier || "—",
            },
            {
              key: "off",
              header: "Offense",
              render: (r) => String(r.offense_points ?? 0),
            },
            {
              key: "def",
              header: "Defense −",
              render: (r) => String(r.defense_penalty ?? 0),
            },
            {
              key: "active",
              header: "Active",
              render: (r) => (r.is_active === false ? "No" : "Yes"),
            },
            {
              key: "actions",
              header: "",
              sticky: "right",
              render: (r) => (
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setDetail({ kind: "category", row: r })}
                  >
                    View
                  </Button>
                  {canWrite ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void confirmAndDelete({
                          title: "Delete service category?",
                          message:
                            "Categories in use by services cannot be deleted until those services are removed.",
                          successMessage: "Service category deleted.",
                          run: async () => {
                            await deleteAdServiceCategory(r.id);
                          },
                        })
                      }
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      ) : null}

      {tab === "namespaces" ? (
        <ResourceTable
          canWrite={canWrite}
          busy={busy}
          rows={filteredNamespaces}
          empty="No namespaces yet."
          createLabel="Create namespace"
          onCreate={async () => {
            const name = await prompt({
              title: "Create namespace",
              label: "Namespace name",
              defaultValue: "",
              confirmLabel: "Create",
            });
            if (!name?.trim()) return;
            setBusy(true);
            try {
              await createAdNamespace({
                name: name.trim(),
                is_active: true,
              });
              setMessage(`Namespace ${name.trim()} created.`);
              await loadTab();
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Failed to create namespace",
              );
            } finally {
              setBusy(false);
            }
          }}
          toolbar={
            <AdTabFilterBar
              total={namespaces.length}
              shown={filteredNamespaces.length}
              hasFilters={hasActiveFilters}
              onClear={clearFilters}
              actions={
                canWrite ? (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void (async () => {
                        const name = await prompt({
                          title: "Create namespace",
                          label: "Namespace name",
                          defaultValue: "",
                          confirmLabel: "Create",
                        });
                        if (!name?.trim()) return;
                        setBusy(true);
                        try {
                          await createAdNamespace({
                            name: name.trim(),
                            is_active: true,
                          });
                          setMessage(`Namespace ${name.trim()} created.`);
                          await loadTab();
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Failed to create namespace",
                          );
                        } finally {
                          setBusy(false);
                        }
                      })()
                    }
                  >
                    Create namespace
                  </Button>
                ) : null
              }
            >
              <FilterTextField
                label="Search"
                value={filters.q}
                onChange={(v) => setFilter("q", v)}
                placeholder="Name, IP pool, status…"
              />
              <FilterSelect
                label="Active"
                value={filters.active}
                onChange={(v) => setFilter("active", v)}
              >
                <option value="">All</option>
                <option value="yes">Active</option>
                <option value="no">Inactive</option>
              </FilterSelect>
              <FilterSelect
                label="Status"
                value={filters.status}
                onChange={(v) => setFilter("status", v)}
              >
                <option value="">All statuses</option>
                {uniqueSorted(namespaces.map((n) => n.status)).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </FilterSelect>
            </AdTabFilterBar>
          }
          columns={[
            {
              key: "name",
              header: "Name",
              render: (r) => r.name,
            },
            {
              key: "ip_pool",
              header: "IP pool",
              render: (r) => r.ip_pool || "—",
            },
            {
              key: "status",
              header: "Status",
              render: (r) => r.status || "—",
            },
            {
              key: "active",
              header: "Active",
              render: (r) => (r.is_active === false ? "no" : "yes"),
            },
            {
              key: "actions",
              header: "",
              sticky: "right",
              render: (r) => (
                <div className="flex justify-end gap-2">
                  {canWrite ? (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() =>
                          void (async () => {
                            setBusy(true);
                            setError(null);
                            try {
                              await updateAdNamespace(r.id, {
                                is_active: r.is_active === false,
                              });
                              await loadTab();
                            } catch (err) {
                              setError(
                                err instanceof Error
                                  ? err.message
                                  : "Failed to update namespace",
                              );
                            } finally {
                              setBusy(false);
                            }
                          })()
                        }
                      >
                        {r.is_active === false ? "Activate" : "Deactivate"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          void confirmAndDelete({
                            title: "Delete namespace?",
                            message: `Remove ${r.name}? Events still using it may block delete.`,
                            successMessage: "Namespace deleted.",
                            run: async () => {
                              await deleteAdNamespace(r.id);
                            },
                          })
                        }
                      >
                        Delete
                      </Button>
                    </>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      ) : null}

      {tab === "machines" ? (
        <ResourceTable
          canWrite={canWrite}
          busy={busy}
          rows={filteredMachines}
          empty="No machines yet. Upload YAML on a challenge and Deploy — the machine appears after success."
          toolbar={
            <AdTabFilterBar
              total={machines.length}
              shown={filteredMachines.length}
              hasFilters={hasActiveFilters}
              onClear={clearFilters}
            >
              <FilterTextField
                label="Search"
                value={filters.q}
                onChange={(v) => setFilter("q", v)}
                placeholder="VM, team, IP, challenge…"
              />
              <FilterSelect
                label="Challenge"
                value={filters.challenge}
                onChange={(v) => setFilter("challenge", v)}
              >
                <option value="">All challenges</option>
                {challengeOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                label="Status"
                value={filters.status}
                onChange={(v) => setFilter("status", v)}
              >
                <option value="">All statuses</option>
                {machineStatusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                label="Team"
                value={filters.team}
                onChange={(v) => setFilter("team", v)}
              >
                <option value="">All teams</option>
                {uniqueSorted(machines.map((m) => m.team_name)).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </FilterSelect>
            </AdTabFilterBar>
          }
          columns={[
            {
              key: "vm",
              header: "VM",
              render: (r) => r.vm_name || r.id.slice(0, 8),
            },
            {
              key: "team",
              header: "Assigned team",
              render: (r) => r.team_name || "—",
            },
            {
              key: "ch",
              header: "Challenge",
              render: (r) => r.challenge_name || r.challenge.slice(0, 8),
            },
            {
              key: "ip",
              header: "IP",
              render: (r) => r.ip_address || "—",
            },
            {
              key: "ns",
              header: "Namespace",
              render: (r) => r.namespace || r.k8s_namespace || "—",
            },
            {
              key: "status",
              header: "Status",
              render: (r) => r.status || "—",
            },
            {
              key: "auth",
              header: "Auth token",
              render: (r) =>
                (r.auth_token || "").trim() ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDetail({ kind: "machine", row: r })}
                  >
                    View token
                  </Button>
                ) : (
                  "—"
                ),
            },
            {
              key: "actions",
              header: "",
              sticky: "right",
              render: (r) => {
                const deployed =
                  r.status === "running" || r.status === "deploying";
                return (
                <div className="flex justify-end gap-2">
                  {canWrite ? (
                    deployed ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() =>
                          void (async () => {
                            setBusy(true);
                            setError(null);
                            setMessage(null);
                            setDeployProgress({
                              challengeName:
                                r.challenge_name ||
                                r.vm_name ||
                                r.id.slice(0, 8),
                              teamName: r.team_name || "Unassigned",
                              mode: "stop",
                            });
                            try {
                              await stopAdMachine(r.id);
                              setMessage(
                                `Stopped ${r.vm_name || r.id.slice(0, 8)}.`,
                              );
                              await loadTab();
                            } catch (err) {
                              if (redirectIfUnauthorized(err, router)) return;
                              setError(
                                err instanceof Error
                                  ? err.message
                                  : "Stop failed",
                              );
                            } finally {
                              setDeployProgress(null);
                              setBusy(false);
                            }
                          })()
                        }
                      >
                        Stop
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void (async () => {
                            setBusy(true);
                            setError(null);
                            setMessage(null);
                            setDeployProgress({
                              challengeName:
                                r.challenge_name ||
                                r.vm_name ||
                                r.id.slice(0, 8),
                              teamName: r.team_name || "Unassigned",
                              mode: "deploy",
                            });
                            try {
                              await spawnAdMachine(r.id);
                              setMessage(
                                `Deployed ${r.vm_name || r.id.slice(0, 8)} from challenge YAML.`,
                              );
                              await loadTab();
                            } catch (err) {
                              if (redirectIfUnauthorized(err, router)) return;
                              setError(
                                err instanceof Error
                                  ? err.message
                                  : "Deploy failed",
                              );
                            } finally {
                              setDeployProgress(null);
                              setBusy(false);
                            }
                          })()
                        }
                      >
                        Deploy
                      </Button>
                    )
                  ) : null}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setDetail({ kind: "machine", row: r })}
                  >
                    View
                  </Button>
                  {canWrite ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void confirmAndDelete({
                          title: "Delete machine?",
                          message: `Remove ${r.vm_name || r.id.slice(0, 8)}?`,
                          successMessage: "Machine deleted.",
                          run: async () => {
                            await deleteAdMachine(r.id);
                          },
                        })
                      }
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
                );
              },
            },
          ]}
        />
      ) : null}

      {tab === "services" ? (
        <ResourceTable
          canWrite={canWrite}
          busy={busy}
          rows={filteredServices}
          empty="No services."
          createLabel="Add service"
          onCreate={async () => {
            if (!challenges.length || !categories.length) {
              setError("Need a challenge and a service category first.");
              return;
            }
            const slot = await prompt({
              title: "Slot (S01–S08)",
              label: "Slot",
              defaultValue: "S01",
              confirmLabel: "Create",
            });
            if (!slot) return;
            setBusy(true);
            try {
              await createAdService({
                challenge: challenges[0].id,
                category: categories[0].id,
                name: `svc-${slot.trim()}`,
                slot: slot.trim().toUpperCase(),
              });
              await loadTab();
            } finally {
              setBusy(false);
            }
          }}
          toolbar={
            <AdTabFilterBar
              total={services.length}
              shown={filteredServices.length}
              hasFilters={hasActiveFilters}
              onClear={clearFilters}
              actions={
                canWrite ? (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void (async () => {
                        if (!challenges.length || !categories.length) {
                          setError(
                            "Need a challenge and a service category first.",
                          );
                          return;
                        }
                        const slot = await prompt({
                          title: "Slot (S01–S08)",
                          label: "Slot",
                          defaultValue: "S01",
                          confirmLabel: "Create",
                        });
                        if (!slot) return;
                        setBusy(true);
                        try {
                          await createAdService({
                            challenge: challenges[0].id,
                            category: categories[0].id,
                            name: `svc-${slot.trim()}`,
                            slot: slot.trim().toUpperCase(),
                          });
                          await loadTab();
                        } finally {
                          setBusy(false);
                        }
                      })()
                    }
                  >
                    Add service
                  </Button>
                ) : null
              }
            >
              <FilterTextField
                label="Search"
                value={filters.q}
                onChange={(v) => setFilter("q", v)}
                placeholder="Slot, name, challenge…"
              />
              <FilterSelect
                label="Challenge"
                value={filters.challenge}
                onChange={(v) => setFilter("challenge", v)}
              >
                <option value="">All challenges</option>
                {challengeOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                label="Category"
                value={filters.category}
                onChange={(v) => setFilter("category", v)}
              >
                <option value="">All categories</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                label="Slot"
                value={filters.slot}
                onChange={(v) => setFilter("slot", v)}
              >
                <option value="">All slots</option>
                {slotOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                label="Status"
                value={filters.status}
                onChange={(v) => setFilter("status", v)}
              >
                <option value="">All statuses</option>
                {serviceStatusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </FilterSelect>
            </AdTabFilterBar>
          }
          columns={[
            { key: "slot", header: "Slot", render: (r) => r.slot },
            { key: "name", header: "Name", render: (r) => r.name },
            {
              key: "challenge",
              header: "Challenge",
              render: (r) => r.challenge_name || r.challenge.slice(0, 8),
            },
            {
              key: "cat",
              header: "Category",
              render: (r) => r.category_name || r.category.slice(0, 8),
            },
            {
              key: "port",
              header: "Port",
              render: (r) => String(r.effective_port ?? r.port ?? "—"),
            },
            {
              key: "st",
              header: "Status",
              render: (r) => r.service_status || "unknown",
            },
            {
              key: "actions",
              header: "",
              sticky: "right",
              render: (r) => (
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setDetail({ kind: "service", row: r })}
                  >
                    View
                  </Button>
                  {canWrite ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void confirmAndDelete({
                          title: "Delete service?",
                          message: `Remove ${r.slot} ${r.name}?`,
                          successMessage: "Service deleted.",
                          run: async () => {
                            await deleteAdService(r.id);
                          },
                        })
                      }
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      ) : null}

      {tab === "flags" ? (
        <ResourceTable
          canWrite={false}
          busy={busy}
          rows={filteredFlags}
          empty="No flags."
          onCreate={async () => undefined}
          toolbar={
            <AdTabFilterBar
              total={flags.length}
              shown={filteredFlags.length}
              hasFilters={hasActiveFilters}
              onClear={clearFilters}
            >
              <FilterTextField
                label="Search"
                value={filters.q}
                onChange={(v) => setFilter("q", v)}
                placeholder="Flag, service, IP…"
              />
              <FilterSelect
                label="Challenge"
                value={filters.challenge}
                onChange={(v) => setFilter("challenge", v)}
              >
                <option value="">All challenges</option>
                {challengeOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                label="Service"
                value={filters.slot}
                onChange={(v) => setFilter("slot", v)}
              >
                <option value="">All services</option>
                {slotOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                label="Round"
                value={filters.round}
                onChange={(v) => setFilter("round", v)}
              >
                <option value="">All rounds</option>
                {roundOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                label="Active"
                value={filters.active}
                onChange={(v) => setFilter("active", v)}
              >
                <option value="">All</option>
                <option value="yes">Active</option>
                <option value="no">Inactive</option>
              </FilterSelect>
              <FilterSelect
                label="Captured"
                value={filters.captured}
                onChange={(v) => setFilter("captured", v)}
              >
                <option value="">All</option>
                <option value="yes">Captured</option>
                <option value="no">Not captured</option>
              </FilterSelect>
            </AdTabFilterBar>
          }
          columns={[
            {
              key: "flag",
              header: "Flag",
              render: (r) => (
                <code className="text-xs">{r.flag.slice(0, 40)}</code>
              ),
            },
            {
              key: "svc",
              header: "Service",
              render: (r) =>
                `${r.service_slot || ""} ${r.service_name || r.service?.slice(0, 8) || ""}`.trim() ||
                "—",
            },
            {
              key: "challenge",
              header: "Challenge",
              render: (r) => r.challenge_name || "—",
            },
            {
              key: "ip",
              header: "VM IP",
              render: (r) => r.machine_ip || "—",
            },
            {
              key: "round",
              header: "Round",
              render: (r) => String(r.round_number ?? r.round.slice(0, 8)),
            },
            {
              key: "active",
              header: "Active",
              render: (r) => (r.is_active ? "yes" : "no"),
            },
            {
              key: "cap",
              header: "Captured",
              render: (r) => (r.is_captured ? "yes" : "no"),
            },
          ]}
        />
      ) : null}

      {tab === "playings" ? (
        <div className="space-y-4">
          <AdTabFilterBar
            total={playingTeams.length}
            shown={filteredPlayingTeams.length}
            hasFilters={hasActiveFilters}
            onClear={clearFilters}
            actions={
              canWrite ? (
                <>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void (async () => {
                        setBusy(true);
                        try {
                          await createAdPlaying({
                            event: eventId,
                            is_open: true,
                            is_active: true,
                          });
                          await loadTab();
                        } finally {
                          setBusy(false);
                        }
                      })()
                    }
                  >
                    Create playing
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      void (async () => {
                        if (!playings.length || !challenges.length) {
                          setError("Create a playing and challenge first.");
                          return;
                        }
                        const teamId = await prompt({
                          title: "Team UUID",
                          label: "teams.Team id",
                          defaultValue: "",
                          confirmLabel: "Attach",
                        });
                        if (!teamId?.trim()) return;
                        setBusy(true);
                        try {
                          await createAdPlayingTeam({
                            ad_playing: playings[0].id,
                            team: teamId.trim(),
                            challenge: challenges[0].id,
                          });
                          await loadTab();
                        } finally {
                          setBusy(false);
                        }
                      })()
                    }
                  >
                    Attach team
                  </Button>
                </>
              ) : null
            }
          >
            <FilterTextField
              label="Search"
              value={filters.q}
              onChange={(v) => setFilter("q", v)}
              placeholder="Team, code, challenge, IP…"
            />
            <FilterSelect
              label="Challenge"
              value={filters.challenge}
              onChange={(v) => setFilter("challenge", v)}
            >
              <option value="">All challenges</option>
              {challengeOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Active"
              value={filters.active}
              onChange={(v) => setFilter("active", v)}
            >
              <option value="">All</option>
              <option value="yes">Active</option>
              <option value="no">Inactive</option>
            </FilterSelect>
            <FilterSelect
              label="Machine"
              value={filters.machine}
              onChange={(v) => setFilter("machine", v)}
            >
              <option value="">All</option>
              <option value="yes">Has machine</option>
              <option value="no">No machine</option>
            </FilterSelect>
          </AdTabFilterBar>
          <ResourceTable
            canWrite={false}
            busy={busy}
            rows={filteredPlayingTeams}
            empty="No playing teams."
            onCreate={async () => undefined}
            onRowClick={(r) => goToChallengeFromPlayingTeam(r)}
            columns={[
              {
                key: "team",
                header: "Team",
                render: (r) => r.team_name || r.team.slice(0, 8),
              },
              {
                key: "code",
                header: "Code",
                render: (r) => r.team_code || "—",
              },
              {
                key: "ch",
                header: "Challenge",
                render: (r) => r.challenge_name || r.challenge.slice(0, 8),
              },
              {
                key: "vm",
                header: "VM IP",
                render: (r) => r.machine_ip || "—",
              },
              {
                key: "svc",
                header: "Services",
                render: (r) =>
                  `${r.services_up ?? 0}↑/${r.services_down ?? 0}↓/${r.services_total ?? 0}`,
              },
              {
                key: "flags",
                header: "Flags",
                render: (r) =>
                  `${r.flags_captured ?? 0}/${r.flags_total ?? 0}`,
              },
              {
                key: "members",
                header: "Members",
                render: (r) => String(r.member_count ?? 0),
              },
              {
                key: "open",
                header: "",
                sticky: "right",
                render: (r) => (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetail({ kind: "playingTeam", row: r });
                    }}
                  >
                    Stats
                  </Button>
                ),
              },
            ]}
          />
        </div>
      ) : null}

      {tab === "submissions" ? (
        <div className="space-y-3">
          <AdTabFilterBar
            total={submissions.length}
            shown={filteredSubmissions.length}
            hasFilters={hasActiveFilters}
            onClear={clearFilters}
          >
            <FilterTextField
              label="Search"
              value={filters.q}
              onChange={(v) => setFilter("q", v)}
              placeholder="Attacker, defender…"
            />
            <FilterSelect
              label="Team"
              value={filters.team}
              onChange={(v) => setFilter("team", v)}
            >
              <option value="">All teams</option>
              {playingTeams.map((pt) => (
                <option key={pt.team} value={pt.team}>
                  {pt.team_name || pt.team.slice(0, 8)}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Valid"
              value={filters.valid}
              onChange={(v) => setFilter("valid", v)}
            >
              <option value="">All</option>
              <option value="yes">Valid</option>
              <option value="no">Invalid</option>
            </FilterSelect>
          </AdTabFilterBar>
          <DataTable
            rows={filteredSubmissions}
            rowKey={(r) => r.id}
            emptyMessage="No flag submissions (read-only)."
            columns={withSerialColumn(filteredSubmissions, [
              {
                key: "atk",
                header: "Attacker",
                render: (r) =>
                  (r.attacker_team && teamNameById.get(r.attacker_team)) ||
                  r.attacker_team?.slice(0, 8) ||
                  "—",
              },
              {
                key: "def",
                header: "Defender",
                render: (r) =>
                  (r.defender_team && teamNameById.get(r.defender_team)) ||
                  r.defender_team?.slice(0, 8) ||
                  "—",
              },
              {
                key: "valid",
                header: "Valid",
                render: (r) => (r.is_valid ? "yes" : "no"),
              },
              {
                key: "score",
                header: "Attack pts",
                render: (r) => String(r.attack_score ?? 0),
              },
              {
                key: "time",
                header: "Submitted",
                render: (r) =>
                  r.submit_time ? formatDate(r.submit_time) : "—",
              },
            ])}
          />
        </div>
      ) : null}

      {tab === "uptime" ? (
        <div className="space-y-3">
          <AdTabFilterBar
            total={uptime.length}
            shown={filteredUptime.length}
            hasFilters={hasActiveFilters}
            onClear={clearFilters}
          >
            <FilterTextField
              label="Search"
              value={filters.q}
              onChange={(v) => setFilter("q", v)}
              placeholder="Team, service, status…"
            />
            <FilterSelect
              label="Team"
              value={filters.team}
              onChange={(v) => setFilter("team", v)}
            >
              <option value="">All teams</option>
              {playingTeams.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.team_name || pt.team.slice(0, 8)}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Slot"
              value={filters.slot}
              onChange={(v) => setFilter("slot", v)}
            >
              <option value="">All slots</option>
              {slotOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Status"
              value={filters.status}
              onChange={(v) => setFilter("status", v)}
            >
              <option value="">All statuses</option>
              {uptimeStatusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </FilterSelect>
          </AdTabFilterBar>
          <DataTable
            rows={filteredUptime}
            rowKey={(r) => r.id}
            emptyMessage="No uptime checks (read-only; scorer writes these)."
            columns={withSerialColumn(filteredUptime, [
              {
                key: "team",
                header: "Playing team",
                render: (r) =>
                  (r.playing_team && teamNameById.get(r.playing_team)) ||
                  r.playing_team?.slice(0, 8) ||
                  "—",
              },
              {
                key: "svc",
                header: "Service",
                render: (r) =>
                  (r.service && serviceLabelById.get(r.service)) ||
                  r.service?.slice(0, 8) ||
                  "—",
              },
              {
                key: "n",
                header: "Check #",
                render: (r) => String(r.round_check_count ?? ""),
              },
            {
              key: "st",
              header: "Status",
              render: (r) => r.service_status || "—",
            },
            {
              key: "t",
              header: "Time",
              render: (r) => (r.check_time ? formatDate(r.check_time) : "—"),
            },
          ])}
          />
        </div>
      ) : null}

      {tab === "matchups" ? (
        <AdEventRosterView
          eventId={eventId}
          canWrite={canWrite}
          playings={playings}
          playingTeams={playingTeams}
          challenges={challenges}
          platformTeams={platformTeams}
          onChanged={async () => {
            await loadRoster();
          }}
        />
      ) : null}

      {detail?.kind === "challenge" ? (
        <ChallengeDetailPanel
          challenge={detail.row}
          categories={categories}
          teamName={
            detail.row ? teamNameForChallenge(detail.row.id) : null
          }
          teamAssigned={
            detail.row ? isChallengeAssignedToTeam(detail.row.id) : false
          }
          canWrite={canWrite}
          onClose={() => setDetail(null)}
          onSaved={async () => {
            await loadTab();
            if (!detail.row) {
              setDetail(null);
              return;
            }
            const refreshed = (await listAdChallenges()).find(
              (c) => c.id === detail.row!.id,
            );
            if (refreshed) setDetail({ kind: "challenge", row: refreshed });
          }}
        />
      ) : null}
      {detail?.kind === "category" ? (
        <CategoryDetailPanel
          category={detail.row}
          canWrite={canWrite}
          onClose={() => setDetail(null)}
          onSaved={loadTab}
        />
      ) : null}
      {detail?.kind === "machine" && detail.row ? (
        <MachineDetailPanel
          machine={detail.row}
          challenges={challenges}
          eventNamespace={globalNamespace}
          canWrite={canWrite}
          onClose={() => setDetail(null)}
          onSaved={async () => {
            await loadTab();
            const refreshed = (await listAdMachines()).find(
              (m) => m.id === detail.row!.id,
            );
            if (refreshed) setDetail({ kind: "machine", row: refreshed });
          }}
        />
      ) : null}
      {detail?.kind === "service" ? (
        <ServiceDetailPanel
          service={detail.row}
          challenges={challenges}
          categories={categories}
          canWrite={canWrite}
          onClose={() => setDetail(null)}
          onSaved={loadTab}
        />
      ) : null}
      {detail?.kind === "pause" ? (
        <PauseDetailPanel
          pause={detail.row}
          canWrite={canWrite}
          onClose={() => setDetail(null)}
          onDelete={async () => {
            await deleteAdPause(eventId, detail.row.id);
            setMessage("Pause deleted; event end recalculated.");
            await loadCore();
          }}
        />
      ) : null}
      {detail?.kind === "playingTeam" ? (
        <PlayingTeamDetailPanel
          playingTeam={detail.row}
          onClose={() => setDetail(null)}
        />
      ) : null}

      <ModalShell
        open={yamlViewer != null}
        onClose={() => setYamlViewer(null)}
        panelClassName="max-w-3xl"
        ariaLabel={yamlViewer?.title || "Challenge YAML"}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {yamlViewer?.title || "Challenge YAML"}
          </h3>
          <Button size="sm" variant="ghost" onClick={() => setYamlViewer(null)}>
            Close
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-4 py-4">
          <pre className="overflow-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-xs leading-relaxed text-[var(--text)] whitespace-pre-wrap">
            {yamlViewer?.content || ""}
          </pre>
        </div>
      </ModalShell>

      <ChallengeDeployProgressModal
        open={deployProgress != null}
        challengeName={deployProgress?.challengeName || ""}
        teamName={deployProgress?.teamName}
        error={deployProgress?.error}
        mode={deployProgress?.mode || "deploy"}
      />
    </div>
  );
}

type TableColumn<T> = {
  key: string;
  header: string;
  sticky?: "left" | "right";
  render: (row: T) => React.ReactNode;
};

function withSerialColumn<T extends { id: string }>(
  rows: T[],
  columns: TableColumn<T>[],
): TableColumn<T>[] {
  return [
    {
      key: "sn",
      header: "#",
      render: (row) => {
        const idx = rows.findIndex((r) => r.id === row.id);
        return String(idx >= 0 ? idx + 1 : "—");
      },
    },
    ...columns,
  ];
}

function AdTabFilterBar({
  total,
  shown,
  hasFilters,
  onClear,
  actions,
  children,
}: {
  total: number;
  shown: number;
  hasFilters: boolean;
  onClear: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <StickyToolbar
      footer={
        <ListPageStats>
          <ListPageStat label="Total" value={total} />
          <ListPageStatsDot />
          <ListPageStat
            label="Shown"
            value={shown}
            tone={shown !== total ? "accent" : "default"}
          />
        </ListPageStats>
      }
    >
      {children}
      <div className="flex shrink-0 flex-wrap items-end gap-2 pb-0.5">
        <Button
          size="sm"
          variant="secondary"
          disabled={!hasFilters}
          onClick={onClear}
        >
          Clear
        </Button>
        {actions}
      </div>
    </StickyToolbar>
  );
}

function ResourceTable<T extends { id: string }>({
  rows,
  columns,
  empty,
  canWrite,
  busy,
  onCreate,
  createLabel = "Create",
  toolbar,
  onRowClick,
  focusRowKey,
  highlightedRowKey,
}: {
  rows: T[];
  columns: TableColumn<T>[];
  empty: string;
  canWrite: boolean;
  busy: boolean;
  onCreate?: () => Promise<void>;
  createLabel?: string;
  toolbar?: React.ReactNode;
  onRowClick?: (row: T) => void;
  focusRowKey?: string | null;
  highlightedRowKey?: string | null;
}) {
  return (
    <div className="space-y-3">
      {toolbar}
      {!toolbar && canWrite && onCreate ? (
        <Button size="sm" disabled={busy} onClick={() => void onCreate()}>
          {createLabel}
        </Button>
      ) : null}
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        emptyMessage={empty}
        columns={withSerialColumn(rows, columns)}
        onRowClick={onRowClick}
        focusRowKey={focusRowKey}
        highlightedRowKey={highlightedRowKey}
      />
    </div>
  );
}
