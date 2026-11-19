export interface PomodoroConfig {
  focusMinutes: number;
  breakMinutes: number;
  volume: number;
  logFolder: string;
  fileNameFormat: string;
  showRibbon: boolean;
  showStatusBar: boolean;
}

export interface WorkSession {
  id: string;
  type: "work";
  phase: "focus" | "overtime";
  task: string;
  outcome: "" | "completed" | "interrupted";
  startedAt: number;
  plannedEndsAt: number;
  focusDurationMs: number;
}

export interface BreakSession {
  id: string;
  type: "break";
  mode?: "manual";
  phase: "manualBreak" | "break" | "breakDone";
  task?: string;
  startedAt: number;
  endsAt?: number;
  breakDurationMs?: number;
}

export type PomodoroSession = WorkSession | BreakSession;

export interface PomodoroLog {
  id: string;
  path: string;
  marker: string;
  markdown: string;
}

export interface PomodoroState {
  version: number;
  settings: PomodoroConfig;
  task: string;
  lastTask: string;
  session: PomodoroSession | null;
  completedWork: { task: string; endedAt: number } | null;
  pendingLogs: PomodoroLog[];
}

const DEFAULTS = {
  version: 1,
  settings: {
    focusMinutes: 25,
    breakMinutes: 5,
    volume: 0.6,
    logFolder: "Pomodoro",
    fileNameFormat: "YYYY-MM-DD-rough-pomodoro-log",
    showRibbon: true,
    showStatusBar: false,
  },
};

const pad = (value: number): string => String(value).padStart(2, "0");
const dateOf = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const timeOf = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};
const dateTimeOf = (timestamp: number): string =>
  `${dateOf(timestamp)} ${timeOf(timestamp)}`;

const fileNameTokens: Record<string, (date: Date) => string> = {
  YYYY: (date) => String(date.getFullYear()),
  YY: (date) => pad(date.getFullYear() % 100),
  MM: (date) => pad(date.getMonth() + 1),
  M: (date) => String(date.getMonth() + 1),
  DD: (date) => pad(date.getDate()),
  D: (date) => String(date.getDate()),
  HH: (date) => pad(date.getHours()),
  mm: (date) => pad(date.getMinutes()),
  ss: (date) => pad(date.getSeconds()),
};

const fileNameTokenPattern = /YYYY|YY|MM|M|DD|D|HH|mm|ss/g;

export const formatLogFileName = (timestamp: number, format: string): string => {
  const date = new Date(timestamp);
  return format.replace(fileNameTokenPattern, (token) => fileNameTokens[token](date));
};

export const normalizeFileNameFormat = (format: string): string | null => {
  const trimmed = format.trim();
  if (
    !trimmed ||
    trimmed.includes("/") ||
    trimmed.includes("\\") ||
    /[\u0000-\u001f]/.test(trimmed) ||
    formatLogFileName(Date.now(), trimmed).trim() === ""
  ) {
    return null;
  }
  return trimmed;
};
const clean = (value: string): string =>
  value
    .replace(/\r?\n/g, " / ")
    .replace(/::/g, ":")
    .replace(/\[/g, "(")
    .replace(/\]/g, ")");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isPomodoroSession = (value: unknown): value is PomodoroSession => {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.startedAt !== "number"
  ) {
    return false;
  }

  if (value.type === "work") {
    return (
      (value.phase === "focus" || value.phase === "overtime") &&
      typeof value.task === "string" &&
      (value.outcome === "" ||
        value.outcome === "completed" ||
        value.outcome === "interrupted") &&
      typeof value.plannedEndsAt === "number" &&
      typeof value.focusDurationMs === "number"
    );
  }

  return (
    value.type === "break" &&
    (value.phase === "manualBreak" ||
      value.phase === "break" ||
      value.phase === "breakDone") &&
    (value.mode === undefined || value.mode === "manual") &&
    (value.task === undefined || typeof value.task === "string") &&
    (value.endsAt === undefined || typeof value.endsAt === "number") &&
    (value.breakDurationMs === undefined || typeof value.breakDurationMs === "number")
  );
};

const isPomodoroLog = (value: unknown): value is PomodoroLog =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.path === "string" &&
  typeof value.marker === "string" &&
  typeof value.markdown === "string";

export const normalizeLogFolder = (path: string): string | null => {
  const segments = path.trim().replace(/\\/g, "/").split("/");
  if (segments.some((segment) => segment.trim() === "..")) return null;
  return segments.filter((segment) => segment && segment !== ".").join("/");
};

export const isSafeLogPath = (path: string): boolean => {
  const normalized = normalizeLogFolder(path);
  return normalized !== null && normalized === path && path.length > 0;
};

export const normalizePomodoroState = (saved: unknown): PomodoroState => {
  const data = isRecord(saved) ? saved : {};
  const settings = isRecord(data.settings) ? data.settings : {};
  const completedWork = isRecord(data.completedWork) ? data.completedWork : null;
  return {
    version: DEFAULTS.version,
    settings: {
      focusMinutes:
        typeof settings.focusMinutes === "number"
          ? settings.focusMinutes
          : DEFAULTS.settings.focusMinutes,
      breakMinutes:
        typeof settings.breakMinutes === "number"
          ? settings.breakMinutes
          : DEFAULTS.settings.breakMinutes,
      volume:
        typeof settings.volume === "number"
          ? settings.volume
          : DEFAULTS.settings.volume,
      logFolder:
        typeof settings.logFolder === "string"
          ? (normalizeLogFolder(settings.logFolder) ?? DEFAULTS.settings.logFolder)
          : DEFAULTS.settings.logFolder,
      fileNameFormat:
        typeof settings.fileNameFormat === "string"
          ? (normalizeFileNameFormat(settings.fileNameFormat) ??
            DEFAULTS.settings.fileNameFormat)
          : DEFAULTS.settings.fileNameFormat,
      showRibbon:
        typeof settings.showRibbon === "boolean"
          ? settings.showRibbon
          : settings.displayLocation === undefined
            ? DEFAULTS.settings.showRibbon
            : settings.displayLocation === "ribbon" ||
              settings.displayLocation === "both",
      showStatusBar:
        typeof settings.showStatusBar === "boolean"
          ? settings.showStatusBar
          : settings.displayLocation === undefined
            ? DEFAULTS.settings.showStatusBar
            : settings.displayLocation === "statusBar" ||
              settings.displayLocation === "both",
    },
    task: typeof data.task === "string" ? data.task : "",
    lastTask: typeof data.lastTask === "string" ? data.lastTask : "",
    session: isPomodoroSession(data.session) ? data.session : null,
    completedWork:
      completedWork &&
      typeof completedWork.task === "string" &&
      typeof completedWork.endedAt === "number"
        ? { task: completedWork.task, endedAt: completedWork.endedAt }
        : null,
    pendingLogs: Array.isArray(data.pendingLogs)
      ? data.pendingLogs.filter(isPomodoroLog)
      : [],
  };
};

const createLog = (
  state: PomodoroState,
  sessionId: string,
  timestamp: number,
  row: string,
): PomodoroLog => {
  const marker = `[Session:: ${sessionId}]`;
  return {
    id: sessionId,
    path: [
      state.settings.logFolder,
      `${formatLogFileName(timestamp, state.settings.fileNameFormat)}.md`,
    ]
      .filter(Boolean)
      .join("/"),
    marker,
    markdown: `${row}\n`,
  };
};

export const createWorkLog = (
  state: PomodoroState,
  session: WorkSession,
  end: number,
  outcome: WorkSession["outcome"],
  note: string,
  endedBy: string,
): PomodoroLog => {
  const scheduled = Math.floor(
      (session.focusDurationMs || session.plannedEndsAt - session.startedAt) / 1000,
    ),
    total = Math.floor((end - session.startedAt) / 1000);
  const row = [
    `- 🍅 Focus [Task:: ${clean(session.task)}]`,
    `[Start:: ${dateTimeOf(session.startedAt)}]`,
    `[End:: ${dateTimeOf(end)}]`,
    `[Scheduled:: ${scheduled}]`,
    `[Total:: ${total}]`,
    `[Status:: ${outcome === "interrupted" ? "interrupted" : "finished"}]`,
    `[Type:: focus]`,
    `[Overtime:: ${Math.max(0, total - scheduled)}]`,
    `[Session:: ${session.id}]`,
    `[StartedBy:: start]`,
    `[EndedBy:: ${endedBy}]`,
    `[Outcome:: ${outcome}]`,
    ...(note ? [`[WorkNote:: ${clean(note)}]`] : []),
    `[Planned:: ${scheduled}]`,
    `[Offset:: ${-new Date(session.startedAt).getTimezoneOffset()}]`,
  ].join(" ");
  return createLog(state, session.id, end, row);
};

export const createBreakLog = (
  state: PomodoroState,
  session: BreakSession,
  end: number,
  endedBy = "stop",
): PomodoroLog => {
  const manual = session.mode === "manual",
    scheduled = manual
      ? null
      : Math.floor(
          (session.breakDurationMs || session.endsAt - session.startedAt) / 1000,
        ),
    total = Math.floor((end - session.startedAt) / 1000);
  const row = [
    `${manual ? "- 🌿 Rest" : "- ☕ Rest"} [Start:: ${dateTimeOf(session.startedAt)}]`,
    `[End:: ${dateTimeOf(end)}]`,
    ...(manual ? [] : [`[Scheduled:: ${scheduled}]`]),
    `[Total:: ${total}]`,
    ...(manual ? [] : [`[Overtime:: ${Math.max(0, total - scheduled)}]`]),
    `[Type:: ${manual ? "manual-break" : "short-break"}]`,
    `[Session:: ${session.id}]`,
    `[StartedBy:: start]`,
    `[EndedBy:: ${endedBy}]`,
    ...(manual ? [] : [`[Planned:: ${scheduled}]`]),
  ].join(" ");
  return createLog(state, session.id, session.startedAt, row);
};

export const startWorkSession = (
  state: PomodoroState,
  task: string,
  now: number,
  sessionId: string,
): PomodoroLog | null => {
  const completedBreakLog =
    state.session?.phase === "breakDone"
      ? createBreakLog(state, state.session, now, "time-up")
      : null;
  const duration = Number(state.settings.focusMinutes) * 60000;
  state.session = {
    id: sessionId,
    type: "work",
    phase: "focus",
    task,
    outcome: "",
    startedAt: now,
    plannedEndsAt: now + duration,
    focusDurationMs: duration,
  };
  state.lastTask = task;
  return completedBreakLog;
};

export const startManualBreakSession = (
  state: PomodoroState,
  sessionId: string,
  now: number,
): void => {
  state.session = {
    id: sessionId,
    type: "break",
    mode: "manual",
    phase: "manualBreak",
    startedAt: now,
  };
};

export const endBreakSession = (state: PomodoroState, now: number): boolean => {
  const session = state.session;
  if (!session || session.type !== "break") return false;
  state.pendingLogs.push(createBreakLog(state, session, now));
  state.session = null;
  state.completedWork = null;
  return true;
};

export const completeWorkSession = (
  state: PomodoroState,
  outcome: WorkSession["outcome"],
  note: string,
  now: number,
  createSessionId: () => string,
): boolean => {
  const session = state.session;
  if (!session || session.type !== "work") return false;
  state.pendingLogs.push(
    createWorkLog(
      state,
      session,
      now,
      outcome,
      note,
      outcome === "interrupted" ? "interrupt" : "stop",
    ),
  );
  state.session = null;
  if (outcome === "completed") {
    state.completedWork = { task: session.task, endedAt: now };
    const duration = Number(state.settings.breakMinutes) * 60000;
    state.session = {
      id: createSessionId(),
      type: "break",
      phase: "break",
      task: session.task,
      startedAt: now,
      endsAt: now + duration,
      breakDurationMs: duration,
    };
  } else {
    state.completedWork = null;
  }
  return true;
};

export const advanceSession = (
  state: PomodoroState,
  now: number,
): "work" | "break" | null => {
  const session = state.session;
  if (
    session?.type === "work" &&
    session.phase === "focus" &&
    now >= session.plannedEndsAt
  ) {
    session.phase = "overtime";
    return "work";
  }
  if (session?.type === "break" && session.phase === "break" && now >= session.endsAt) {
    session.phase = "breakDone";
    return "break";
  }
  return null;
};
