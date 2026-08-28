export type Mood = "very_bad" | "low" | "ok" | "good" | "great";
export type Pain = "none" | "mild" | "moderate";

export type Profile = {
  profile_id: number;
  display_name: string;
  goal: "health" | "shape" | "strength";
  experience_level: "beginner" | "intermediate" | "advanced";
  weekly_frequency: number;
  session_minutes: number;
  equipment: string[];
  injured_areas: string[];
  cycle_mode: "natural" | "hormonal" | "irregular" | "unknown";
  typical_cycle_days: number;
  is_adult: boolean;
  cycle_consent: boolean;
  mood_consent: boolean;
  consent_version: string;
};

export type Exercise = {
  id: string;
  name_zh: string;
  name_en: string;
  category: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string[];
  level: string;
  home_friendly: boolean;
  swap_group: string;
};

export type PlanExercise = {
  exercise_id: string;
  name_zh: string;
  name_en: string;
  category: string;
  primary_muscles: string[];
  swap_group: string;
  equipment: string[];
  level: string;
  sets: number;
  reps: string;
  rpe: number;
  rest_sec: number;
  swap_alternatives: string[];
};

export type PlanBlock = {
  type: "warmup" | "main" | "cooldown" | "recovery";
  title: string;
  duration_min?: number;
  items?: string[];
  exercises?: PlanExercise[];
};

export type Plan = {
  goal: string;
  duration_min: number;
  readiness_band: string;
  readiness_label: string;
  mood: Mood;
  confidence: number;
  confidence_factors: string[];
  comfort_msg: string;
  rest_suggestion: string;
  rationale: string[];
  blocks: PlanBlock[];
  validation_status: "pass" | "fallback";
  mode?: "rest";
};

export type CycleData = {
  mode: Profile["cycle_mode"];
  has_data: boolean;
  status: "disabled" | "tracking_only" | "collecting" | "baseline_estimate" | "personal_estimate" | "low_confidence" | "ready";
  prediction_tier: "none" | "baseline" | "personal" | "history";
  prediction_basis: string;
  confidence_label: string;
  sample_size: number;
  avg_cycle: number | null;
  last_period: string | null;
  next_period: string | null;
  next_period_window: { start: string; end: string } | null;
  cycle_day: number | null;
  phase: { key: string; name: string; days: string; hormone: string } | null;
  confidence: number;
  phases: { key: string; name: string; days: string; hormone: string }[];
  recent: string[];
  observation: {
    days_elapsed: number;
    logged_days: number;
    target_days: number;
    complete: boolean;
    percent: number;
    message: string;
  };
  records: { id: number | null; start_date: string; end_date: string | null }[];
  message: string;
  disclaimer: string;
};

export type CheckinResponse =
  | { status: "safety_stop"; red_flags: { code: string; message: string }[] }
  | {
      status: "ok";
      checkin_id: number;
      plan_id: number;
      mood: { mood: Mood; tag: string; source: string } | null;
      readiness: { score: number; band: string; label: string; adjust: string };
      cycle_context: CycleData;
      confidence: number;
      confidence_factors: string[];
      comfort_msg: string;
      rest_suggestion: string;
      rationale_text: string;
      plan: Plan;
      context_disclosure: { used: string[]; never_sent_to_ai: string[] };
    };

export type DiaryRecord = {
  id: number;
  day: string;
  diary: string;
  mood: Mood;
  tag: string;
  created_at: string;
};

export type Insights = {
  window_days: number;
  week_session_count: number;
  session_count: number;
  avg_completion: number | null;
  avg_rpe: number | null;
  pain_event_count: number;
  observations: string[];
  mood_summary: {
    available: boolean;
    sample_size: number;
    minimum_sample: number;
    distribution: Partial<Record<Mood, number>>;
    message: string;
  };
  mood_trend: { mood: Mood; tag: string; at: string }[];
  disclaimer: string;
};

export type ChatResponse = {
  reply: string;
  change: Record<string, unknown> | null;
  preview: {
    blocks: PlanBlock[];
    duration_min: number;
    rationale: string[];
    validation_status: "pass";
  } | null;
  context_disclosure: string[];
};

export type ExportData = {
  exported_at: string;
  schema_version: string;
  profile: Array<Profile & Record<string, unknown>>;
  checkins: Record<string, unknown>[];
  plans: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  moods: Record<string, unknown>[];
  periods: Record<string, unknown>[];
  safety_events: Record<string, unknown>[];
};

export class ApiError extends Error {
  constructor(
    public code: string,
    public userMessage: string,
    public retryable = false,
  ) {
    super(userMessage);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...init?.headers },
      ...init,
    });
  } catch {
    throw new ApiError("network", "网络连接失败，请检查后端是否已启动", true);
  }
  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { detail?: string | { msg?: string }[] };
      detail = typeof body.detail === "string"
        ? body.detail
        : body.detail?.map((item) => item.msg || "").filter(Boolean).join("；") || "";
    } catch {
      detail = "";
    }
    const fallback = response.status === 401
      ? "会话已失效，请重新建立档案"
      : response.status === 404
        ? "资源不存在"
        : `请求失败（${response.status}）`;
    throw new ApiError(`http_${response.status}`, detail || fallback, response.status >= 500);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  onboarding: (body: Record<string, unknown>) =>
    request<{ profile_id: number; session: string }>("/api/v1/onboarding", {
      method: "POST", body: JSON.stringify(body),
    }),
  session: () => request<Profile>("/api/v1/session"),
  checkin: (body: Record<string, unknown>) =>
    request<CheckinResponse>("/api/v1/checkin", { method: "POST", body: JSON.stringify(body) }),
  exercises: () => request<Exercise[]>("/api/v1/exercises"),
  profile: (id: number) => request<Profile>(`/api/v1/profile/${id}`),
  updateProfile: (id: number, body: Record<string, unknown>) =>
    request<Profile>(`/api/v1/profile/${id}`, {
      method: "PATCH", body: JSON.stringify(body),
    }),
  plan: (id: number) => request<Plan>(`/api/v1/plan/${id}`),
  plans: (profileId: number) => request<Array<Record<string, unknown>>>(`/api/v1/plans/${profileId}`),
  feedback: (body: Record<string, unknown>) =>
    request<{ session_id: number; status: string; completion: number }>("/api/v1/feedback", {
      method: "POST", body: JSON.stringify(body),
    }),
  insights: (profileId: number) => request<Insights>(`/api/v1/insights/${profileId}`),
  diaries: (profileId: number) => request<DiaryRecord[]>(`/api/v1/diaries/${profileId}`),
  deleteDiary: (profileId: number, checkinId: number) =>
    request<{ status: string }>(`/api/v1/diaries/${profileId}/${checkinId}`, { method: "DELETE" }),
  cycle: (profileId: number) => request<CycleData>(`/api/v1/cycle/${profileId}`),
  addPeriod: (body: Record<string, unknown>) =>
    request<{ status: string; id: number }>("/api/v1/periods", {
      method: "POST", body: JSON.stringify(body),
    }),
  deletePeriod: (profileId: number, periodId: number) =>
    request<{ status: string }>(`/api/v1/periods/${profileId}/${periodId}`, { method: "DELETE" }),
  chat: (body: Record<string, unknown>) =>
    request<ChatResponse>("/api/v1/chat", { method: "POST", body: JSON.stringify(body) }),
  chatApply: (body: Record<string, unknown>) =>
    request<{ plan_id: number; version: number; duration_min: number; blocks: PlanBlock[]; rationale: string[] }>(
      "/api/v1/chat/apply", { method: "POST", body: JSON.stringify(body) },
    ),
  updateConsents: (profileId: number, body: { cycle_consent: boolean; mood_consent: boolean }) =>
    request<{ status: string; cycle_consent: boolean; mood_consent: boolean; message: string }>(
      `/api/v1/profile/${profileId}/consents`,
      { method: "PATCH", body: JSON.stringify(body) },
    ),
  export: (profileId: number) => request<ExportData>(`/api/v1/export/${profileId}`),
  deleteProfile: (profileId: number) =>
    request<{ status: string }>(`/api/v1/profile/${profileId}`, { method: "DELETE" }),
};
