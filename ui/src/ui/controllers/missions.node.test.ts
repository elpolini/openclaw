import { describe, expect, it } from "vitest";
import {
  createMission,
  DEFAULT_MISSIONS_FORM,
  deleteMission,
  loadMissions,
  patchMissionForm,
  selectMission,
  toggleMissionsForm,
  updateMissionStatus,
  type MissionsState,
} from "./missions.ts";

function makeState(overrides: Partial<MissionsState> = {}): MissionsState {
  return {
    missionsLoading: false,
    missions: [],
    missionsError: null,
    missionsForm: { ...DEFAULT_MISSIONS_FORM },
    missionsShowForm: false,
    missionsSelectedId: null,
    ...overrides,
  };
}

describe("missions controller", () => {
  it("loadMissions sets loading to false", () => {
    const state = makeState({ missionsLoading: true });
    loadMissions(state);
    expect(state.missionsLoading).toBe(false);
  });

  it("createMission requires a name", () => {
    const state = makeState({ missionsShowForm: true });
    createMission(state);
    expect(state.missionsError).toBe("Mission name is required.");
    expect(state.missions).toHaveLength(0);
  });

  it("createMission adds a mission with correct fields", () => {
    const state = makeState({
      missionsShowForm: true,
      missionsForm: {
        name: "Test Mission",
        description: "A test",
        priority: "high",
        agents: "main, coder",
        tags: "infra, test",
      },
    });
    createMission(state);
    expect(state.missionsError).toBeNull();
    expect(state.missions).toHaveLength(1);

    const mission = state.missions[0];
    expect(mission.name).toBe("Test Mission");
    expect(mission.description).toBe("A test");
    expect(mission.priority).toBe("high");
    expect(mission.agents).toEqual(["main", "coder"]);
    expect(mission.tags).toEqual(["infra", "test"]);
    expect(mission.status).toBe("pending");
    expect(mission.progress).toBe(0);
    expect(mission.timeline).toHaveLength(1);
    expect(mission.timeline[0].event).toBe("Mission created");
  });

  it("createMission resets form and hides it", () => {
    const state = makeState({
      missionsShowForm: true,
      missionsForm: { ...DEFAULT_MISSIONS_FORM, name: "Test" },
    });
    createMission(state);
    expect(state.missionsShowForm).toBe(false);
    expect(state.missionsForm.name).toBe("");
  });

  it("createMission selects the new mission", () => {
    const state = makeState({
      missionsForm: { ...DEFAULT_MISSIONS_FORM, name: "Test" },
    });
    createMission(state);
    expect(state.missionsSelectedId).toBe(state.missions[0].id);
  });

  it("updateMissionStatus changes status and adds timeline entry", () => {
    const state = makeState({
      missionsForm: { ...DEFAULT_MISSIONS_FORM, name: "Test" },
    });
    createMission(state);
    const id = state.missions[0].id;

    updateMissionStatus(state, id, "running");
    expect(state.missions[0].status).toBe("running");
    expect(state.missions[0].progress).toBe(10);
    expect(state.missions[0].timeline).toHaveLength(2);
  });

  it("updateMissionStatus to completed sets progress to 100", () => {
    const state = makeState({
      missionsForm: { ...DEFAULT_MISSIONS_FORM, name: "Test" },
    });
    createMission(state);
    const id = state.missions[0].id;

    updateMissionStatus(state, id, "running");
    updateMissionStatus(state, id, "completed");
    expect(state.missions[0].status).toBe("completed");
    expect(state.missions[0].progress).toBe(100);
    expect(state.missions[0].completedAt).toBeDefined();
  });

  it("deleteMission removes the mission", () => {
    const state = makeState({
      missionsForm: { ...DEFAULT_MISSIONS_FORM, name: "Test" },
    });
    createMission(state);
    const id = state.missions[0].id;

    deleteMission(state, id);
    expect(state.missions).toHaveLength(0);
    expect(state.missionsSelectedId).toBeNull();
  });

  it("patchMissionForm updates form fields", () => {
    const state = makeState();
    patchMissionForm(state, { name: "Updated Name" });
    expect(state.missionsForm.name).toBe("Updated Name");
    expect(state.missionsForm.priority).toBe("medium");
  });

  it("toggleMissionsForm toggles form visibility", () => {
    const state = makeState();
    toggleMissionsForm(state);
    expect(state.missionsShowForm).toBe(true);
    toggleMissionsForm(state);
    expect(state.missionsShowForm).toBe(false);
  });

  it("selectMission sets the selected mission id", () => {
    const state = makeState();
    selectMission(state, "test-id");
    expect(state.missionsSelectedId).toBe("test-id");
    selectMission(state, null);
    expect(state.missionsSelectedId).toBeNull();
  });

  it("createMission trims whitespace from agents and tags", () => {
    const state = makeState({
      missionsForm: {
        name: "Test",
        description: "",
        priority: "medium",
        agents: " main ,  ,  coder ",
        tags: " infra , , test ",
      },
    });
    createMission(state);
    expect(state.missions[0].agents).toEqual(["main", "coder"]);
    expect(state.missions[0].tags).toEqual(["infra", "test"]);
  });

  it("cancelled status deselects mission", () => {
    const state = makeState({
      missionsForm: { ...DEFAULT_MISSIONS_FORM, name: "Test" },
    });
    createMission(state);
    const id = state.missions[0].id;
    state.missionsSelectedId = id;

    updateMissionStatus(state, id, "cancelled");
    expect(state.missionsSelectedId).toBeNull();
  });
});
