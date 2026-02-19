import { html, nothing } from "lit";
import { formatRelativeTimestamp } from "../format.ts";

export type MissionStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type MissionPriority = "low" | "medium" | "high" | "critical";

export type MissionTimelineEntry = {
  timestamp: number;
  event: string;
  agentId?: string;
  detail?: string;
};

export type Mission = {
  id: string;
  name: string;
  description: string;
  status: MissionStatus;
  priority: MissionPriority;
  agents: string[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  progress: number;
  timeline: MissionTimelineEntry[];
  tags: string[];
};

export type MissionsFormState = {
  name: string;
  description: string;
  priority: MissionPriority;
  agents: string;
  tags: string;
};

export type MissionsProps = {
  loading: boolean;
  missions: Mission[];
  error: string | null;
  form: MissionsFormState;
  showForm: boolean;
  selectedMissionId: string | null;
  availableAgents: string[];
  onRefresh: () => void;
  onFormChange: (patch: Partial<MissionsFormState>) => void;
  onToggleForm: () => void;
  onCreateMission: () => void;
  onSelectMission: (id: string | null) => void;
  onUpdateStatus: (id: string, status: MissionStatus) => void;
  onDeleteMission: (id: string) => void;
};

const STATUS_LABELS: Record<MissionStatus, string> = {
  pending: "Pending",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

const STATUS_CLASS: Record<MissionStatus, string> = {
  pending: "",
  running: "ok",
  completed: "ok",
  failed: "warn",
  cancelled: "",
};

const PRIORITY_LABELS: Record<MissionPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export function renderMissions(props: MissionsProps) {
  const selected = props.selectedMissionId
    ? props.missions.find((m) => m.id === props.selectedMissionId)
    : null;

  return html`
    ${renderMissionsSummary(props)}
    ${props.showForm ? renderMissionsForm(props) : nothing}
    ${selected ? renderMissionDetail(selected, props) : nothing}
    ${renderMissionsList(props)}
  `;
}

function renderMissionsSummary(props: MissionsProps) {
  const total = props.missions.length;
  const running = props.missions.filter((m) => m.status === "running").length;
  const completed = props.missions.filter((m) => m.status === "completed").length;
  const failed = props.missions.filter((m) => m.status === "failed").length;
  const pending = props.missions.filter((m) => m.status === "pending").length;
  const agents = new Set(props.missions.flatMap((m) => m.agents));

  return html`
    <section class="grid grid-cols-3" style="margin-bottom: 18px;">
      <div class="card stat-card">
        <div class="stat-label">TOTAL MISSIONS</div>
        <div class="stat-value">${total}</div>
        <div class="muted">${running} running · ${pending} pending</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">COMPLETION RATE</div>
        <div class="stat-value">${total > 0 ? Math.round((completed / total) * 100) : 0}%</div>
        <div class="muted">${completed} completed · ${failed} failed</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">AGENTS INVOLVED</div>
        <div class="stat-value">${agents.size}</div>
        <div class="muted">Across ${total} missions</div>
      </div>
    </section>
  `;
}

function renderMissionsForm(props: MissionsProps) {
  return html`
    <section class="card" style="margin-bottom: 18px;">
      <div class="card-title">Create Mission</div>
      <div class="card-sub">Define a new multi-agent mission with objectives and assignments.</div>
      <div class="form-grid" style="margin-top: 16px;">
        <label class="field">
          <span>Mission Name</span>
          <input
            .value=${props.form.name}
            @input=${(e: Event) => props.onFormChange({ name: (e.target as HTMLInputElement).value })}
            placeholder="e.g. Deploy staging environment"
          />
        </label>
        <label class="field">
          <span>Description</span>
          <textarea
            .value=${props.form.description}
            @input=${(e: Event) => props.onFormChange({ description: (e.target as HTMLTextAreaElement).value })}
            placeholder="Describe the mission objectives and success criteria..."
            rows="3"
            style="resize: vertical; font-family: inherit; font-size: inherit;"
          ></textarea>
        </label>
        <label class="field">
          <span>Priority</span>
          <select
            .value=${props.form.priority}
            @change=${(e: Event) => props.onFormChange({ priority: (e.target as HTMLSelectElement).value as MissionPriority })}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>
        <label class="field">
          <span>Assigned Agents (comma-separated)</span>
          <input
            .value=${props.form.agents}
            @input=${(e: Event) => props.onFormChange({ agents: (e.target as HTMLInputElement).value })}
            placeholder="main, researcher, coder"
          />
        </label>
        <label class="field">
          <span>Tags (comma-separated)</span>
          <input
            .value=${props.form.tags}
            @input=${(e: Event) => props.onFormChange({ tags: (e.target as HTMLInputElement).value })}
            placeholder="deployment, staging, infra"
          />
        </label>
      </div>
      <div class="row" style="margin-top: 14px; gap: 8px;">
        <button class="btn" @click=${() => props.onCreateMission()}>Create Mission</button>
        <button class="btn" @click=${() => props.onToggleForm()}>Cancel</button>
      </div>
    </section>
  `;
}

function renderMissionDetail(mission: Mission, props: MissionsProps) {
  const agentList = mission.agents.length > 0 ? mission.agents.join(", ") : "none";

  return html`
    <section class="card" style="margin-bottom: 18px;">
      <div class="row" style="justify-content: space-between; align-items: flex-start;">
        <div>
          <div class="card-title">${mission.name}</div>
          <div class="card-sub">${mission.description || "No description"}</div>
        </div>
        <button class="btn" @click=${() => props.onSelectMission(null)}>Close</button>
      </div>

      <div class="stat-grid" style="margin-top: 16px;">
        <div class="stat">
          <div class="stat-label">STATUS</div>
          <div class="stat-value ${STATUS_CLASS[mission.status]}">
            ${STATUS_LABELS[mission.status]}
          </div>
        </div>
        <div class="stat">
          <div class="stat-label">PRIORITY</div>
          <div class="stat-value">${PRIORITY_LABELS[mission.priority]}</div>
        </div>
        <div class="stat">
          <div class="stat-label">PROGRESS</div>
          <div class="stat-value">${mission.progress}%</div>
        </div>
        <div class="stat">
          <div class="stat-label">AGENTS</div>
          <div class="stat-value" style="font-size: 13px;">${agentList}</div>
        </div>
      </div>

      ${renderProgressBar(mission.progress)}

      <div class="row" style="margin-top: 14px; gap: 8px; flex-wrap: wrap;">
        ${
          mission.status === "pending"
            ? html`<button class="btn" @click=${() => props.onUpdateStatus(mission.id, "running")}>Start</button>`
            : nothing
        }
        ${
          mission.status === "running"
            ? html`
                <button class="btn" @click=${() => props.onUpdateStatus(mission.id, "completed")}>Complete</button>
                <button class="btn" @click=${() => props.onUpdateStatus(mission.id, "failed")}>Mark Failed</button>
              `
            : nothing
        }
        ${
          mission.status !== "cancelled" && mission.status !== "completed"
            ? html`<button class="btn" @click=${() => props.onUpdateStatus(mission.id, "cancelled")}>Cancel</button>`
            : nothing
        }
        <button
          class="btn"
          style="margin-left: auto;"
          @click=${() => {
            if (confirm("Delete this mission?")) {
              props.onDeleteMission(mission.id);
            }
          }}
        >Delete</button>
      </div>

      ${
        mission.tags.length > 0
          ? html`
          <div class="chip-row" style="margin-top: 12px;">
            ${mission.tags.map((tag) => html`<span class="chip">${tag}</span>`)}
          </div>
        `
          : nothing
      }

      ${renderTimeline(mission.timeline)}
    </section>
  `;
}

function renderProgressBar(progress: number) {
  const clamped = Math.max(0, Math.min(100, progress));
  return html`
    <div
      style="margin-top: 12px; height: 6px; border-radius: 3px; background: var(--border); overflow: hidden;"
    >
      <div
        style="height: 100%; width: ${clamped}%; border-radius: 3px; background: var(--accent); transition: width 0.3s ease;"
      ></div>
    </div>
  `;
}

function renderTimeline(timeline: MissionTimelineEntry[]) {
  if (timeline.length === 0) {
    return html`
      <div class="muted" style="margin-top: 14px">No timeline events yet.</div>
    `;
  }

  const sorted = timeline.toSorted((a, b) => b.timestamp - a.timestamp);

  return html`
    <div style="margin-top: 18px;">
      <div class="card-title" style="font-size: 13px;">Timeline</div>
      <div class="list" style="margin-top: 8px;">
        ${sorted.map(
          (entry) => html`
            <div class="list-item" style="padding: 8px 0;">
              <div class="list-main">
                <div class="list-title" style="font-size: 13px;">${entry.event}</div>
                ${entry.detail ? html`<div class="list-sub">${entry.detail}</div>` : nothing}
              </div>
              <div class="list-meta">
                <div style="font-size: 12px;">${formatRelativeTimestamp(entry.timestamp)}</div>
                ${entry.agentId ? html`<div class="muted">${entry.agentId}</div>` : nothing}
              </div>
            </div>
          `,
        )}
      </div>
    </div>
  `;
}

function renderMissionsList(props: MissionsProps) {
  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title">All Missions</div>
          <div class="card-sub">Track and manage multi-agent mission orchestration.</div>
        </div>
        <div class="row" style="gap: 8px;">
          <button class="btn" @click=${() => props.onToggleForm()}>
            ${props.showForm ? "Hide Form" : "New Mission"}
          </button>
          <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
            ${props.loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>
      ${
        props.error
          ? html`<div class="callout danger" style="margin-top: 12px;">${props.error}</div>`
          : nothing
      }
      <div class="list" style="margin-top: 16px;">
        ${
          props.missions.length === 0
            ? html`
                <div class="muted">No missions yet. Create one to start orchestrating agents.</div>
              `
            : props.missions.map((mission) => renderMissionRow(mission, props))
        }
      </div>
    </section>
  `;
}

function renderMissionRow(mission: Mission, props: MissionsProps) {
  const isSelected = props.selectedMissionId === mission.id;
  const agentCount = mission.agents.length;

  return html`
    <div
      class="list-item"
      style="cursor: pointer; ${isSelected ? "background: var(--bg-subtle);" : ""}"
      @click=${() => props.onSelectMission(isSelected ? null : mission.id)}
    >
      <div class="list-main">
        <div class="list-title">${mission.name}</div>
        <div class="list-sub">${mission.description || "No description"}</div>
        <div class="chip-row">
          <span class="chip ${STATUS_CLASS[mission.status]}">
            ${STATUS_LABELS[mission.status]}
          </span>
          <span class="chip">${PRIORITY_LABELS[mission.priority]}</span>
          <span class="chip">${agentCount} agent${agentCount !== 1 ? "s" : ""}</span>
          ${mission.tags.map((tag) => html`<span class="chip">${tag}</span>`)}
        </div>
      </div>
      <div class="list-meta">
        <div>${mission.progress}%</div>
        <div class="muted">${formatRelativeTimestamp(mission.updatedAt)}</div>
      </div>
    </div>
  `;
}
