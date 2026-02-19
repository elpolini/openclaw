import type {
  Mission,
  MissionsFormState,
  MissionStatus,
  MissionTimelineEntry,
} from "../views/missions.ts";

export type { MissionsFormState } from "../views/missions.ts";

export type MissionsState = {
  missionsLoading: boolean;
  missions: Mission[];
  missionsError: string | null;
  missionsForm: MissionsFormState;
  missionsShowForm: boolean;
  missionsSelectedId: string | null;
};

export const DEFAULT_MISSIONS_FORM: MissionsFormState = {
  name: "",
  description: "",
  priority: "medium",
  agents: "",
  tags: "",
};

function generateId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function addTimelineEntry(
  mission: Mission,
  event: string,
  detail?: string,
  agentId?: string,
): Mission {
  const entry: MissionTimelineEntry = {
    timestamp: Date.now(),
    event,
    ...(detail ? { detail } : {}),
    ...(agentId ? { agentId } : {}),
  };
  return {
    ...mission,
    timeline: [...mission.timeline, entry],
    updatedAt: Date.now(),
  };
}

export function loadMissions(state: MissionsState) {
  // Missions are managed in local state for now.
  // When the gateway adds a missions RPC, this will call state.client.request().
  state.missionsLoading = false;
}

export function createMission(state: MissionsState) {
  const form = state.missionsForm;
  if (!form.name.trim()) {
    state.missionsError = "Mission name is required.";
    return;
  }

  const agents = form.agents
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  const tags = form.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const now = Date.now();
  const mission: Mission = {
    id: generateId(),
    name: form.name.trim(),
    description: form.description.trim(),
    status: "pending",
    priority: form.priority,
    agents,
    createdAt: now,
    updatedAt: now,
    progress: 0,
    timeline: [{ timestamp: now, event: "Mission created" }],
    tags,
  };

  state.missions = [mission, ...state.missions];
  state.missionsForm = { ...DEFAULT_MISSIONS_FORM };
  state.missionsShowForm = false;
  state.missionsError = null;
  state.missionsSelectedId = mission.id;
}

export function updateMissionStatus(state: MissionsState, id: string, status: MissionStatus) {
  state.missions = state.missions.map((m) => {
    if (m.id !== id) {
      return m;
    }
    let updated = { ...m, status, updatedAt: Date.now() };
    if (status === "completed") {
      updated.completedAt = Date.now();
      updated.progress = 100;
    }
    if (status === "running" && m.progress === 0) {
      updated.progress = 10;
    }
    updated = addTimelineEntry(updated, `Status changed to ${status}`);
    return updated;
  });
  if (status === "completed" || status === "cancelled") {
    state.missionsSelectedId = null;
  }
}

export function deleteMission(state: MissionsState, id: string) {
  state.missions = state.missions.filter((m) => m.id !== id);
  if (state.missionsSelectedId === id) {
    state.missionsSelectedId = null;
  }
}

export type MissionFormPatch = Partial<MissionsFormState>;

export function patchMissionForm(state: MissionsState, patch: MissionFormPatch) {
  state.missionsForm = { ...state.missionsForm, ...patch };
}

export function toggleMissionsForm(state: MissionsState) {
  state.missionsShowForm = !state.missionsShowForm;
  if (state.missionsShowForm) {
    state.missionsForm = { ...DEFAULT_MISSIONS_FORM };
  }
}

export function selectMission(state: MissionsState, id: string | null) {
  state.missionsSelectedId = id;
}
