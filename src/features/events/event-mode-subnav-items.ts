export type ModeSubnavItem = {
  id: string;
  label: string;
  href: string;
};

export function ctfSubnavItems(hackathonId: string): ModeSubnavItem[] {
  const base = `/events/${hackathonId}/ctf`;
  return [
    { id: "window", label: "Play window", href: base },
    { id: "leaderboard", label: "Leaderboard", href: `${base}/leaderboard` },
    { id: "challenges", label: "Challenges", href: `${base}/challenges` },
    {
      id: "qa",
      label: "Question answers",
      href: `${base}/question-answers`,
    },
    {
      id: "submissions",
      label: "Team submissions",
      href: `${base}/submissions`,
    },
    { id: "machines", label: "Machines", href: `${base}/machines` },
  ];
}

export function kothSubnavItems(hackathonId: string): ModeSubnavItem[] {
  const base = `/events/${hackathonId}/koth`;
  return [
    { id: "sessions", label: "Sessions", href: base },
    { id: "window", label: "Play window", href: `${base}/schedule` },
    { id: "leaderboard", label: "Leaderboard", href: `${base}/leaderboard` },
  ];
}

export function adSubnavItems(hackathonId: string): ModeSubnavItem[] {
  const base = `/events/${hackathonId}/ad`;
  return [{ id: "window", label: "Play window", href: base }];
}
