export type HackathonModules = {
  jeopardy_enabled?: boolean;
  koth_enabled?: boolean;
  attack_defence_enabled?: boolean;
  viewer_can_export?: boolean;
};

export type Hackathon = {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  city?: string | null;
  organization?: {
    id: string;
    name: string;
    description?: string | null;
    media_url?: string | null;
    is_active?: boolean;
  } | null;
  start_datetime?: string | null;
  end_datetime?: string | null;
  is_infinite?: boolean;
  is_active?: boolean;
  is_deleted?: boolean;
  view_on_dashboard?: boolean;
  discord_link?: string;
  created_at?: string;
  sponsors?: Array<{
    id: string;
    name: string;
    tag?: string;
    organization_type?: string;
    active?: boolean;
    image_url?: string | null;
  }>;
  modules?: HackathonModules | null;
  my_roles?: string[];
};

export type HackathonWriteInput = {
  name?: string;
  display_name?: string;
  description?: string;
  city?: string | null;
  start_datetime?: string;
  end_datetime?: string;
  is_infinite?: boolean;
  is_active?: boolean;
  view_on_dashboard?: boolean;
  discord_link?: string;
  organizer_id?: string | null;
  sponsor_ids?: string[];
};
