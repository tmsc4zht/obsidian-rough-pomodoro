var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => Pomodoro
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// components.ts
var import_obsidian = require("obsidian");

// timer.ts
var pad = (value) => String(value).padStart(2, "0");
var timeOf = (timestamp) => {
  const date = new Date(timestamp);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};
var clock = (milliseconds) => {
  const seconds = Math.max(0, Math.floor(milliseconds / 1e3));
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
};
var timerDisplay = (state, duration, end, overtime = false) => ({
  state,
  timer: `${overtime ? "+" : ""}${clock(duration)}`,
  end
});

// components.ts
var createField = (parent, label, type, value) => {
  const labelElement = parent.createEl("label", { text: label });
  const input = labelElement.createEl("input");
  input.type = type;
  input.value = String(value);
  return input;
};
var createHeaderAndTask = (card, root, options) => {
  const header = card.createDiv({ cls: "rough-pomodoro-header" });
  header.createEl("b", { text: "POMODORO" });
  const close = header.createEl("button", { text: "\xD7" });
  close.onclick = () => root.remove();
  const task = createField(card, options.t("task"), "text", options.task);
  task.oninput = () => options.onTaskInput(task.value);
  return task;
};
var createHero = (card) => {
  const hero = card.createDiv({ cls: "rough-pomodoro-hero" });
  return {
    label: hero.createDiv(),
    state: hero.createDiv(),
    timer: hero.createDiv({ cls: "rough-pomodoro-clock" }),
    end: hero.createDiv()
  };
};
var createSettings = (card, options) => {
  const settings = card.createEl("details");
  settings.createEl("summary", { text: options.t("timerSettings") });
  const grid = settings.createDiv({ cls: "rough-pomodoro-grid" });
  const focus = createField(
    grid,
    options.t("focusMinutes"),
    "number",
    options.settings.focusMinutes
  ), rest = createField(
    grid,
    options.t("breakMinutes"),
    "number",
    options.settings.breakMinutes
  ), volume = createField(grid, options.t("volume"), "range", options.settings.volume);
  const folder = createField(
    settings,
    options.t("logFolder"),
    "text",
    options.settings.logFolder
  );
  const settingInputs = [
    [focus, "focusMinutes"],
    [rest, "breakMinutes"],
    [volume, "volume"],
    [folder, "logFolder"]
  ];
  for (const [input, key] of settingInputs) {
    input.onchange = () => {
      const value = options.onSettingChange(key, input.value);
      input.value = String(value ?? options.settings[key]);
    };
  }
  const preview = settings.createEl("button", { text: options.t("preview") });
  preview.onclick = options.onPreview;
  return { focus, rest, volume, folder, preview };
};
var createActions = (card, options) => {
  const actions = card.createDiv({ cls: "rough-pomodoro-actions" });
  const button = (text, onClick) => {
    const element = actions.createEl("button", { text });
    element.onclick = onClick;
    return element;
  };
  return {
    start: button(options.t("start"), options.onStart),
    finish: button(options.t("finish"), options.onEnd),
    manual: button(options.t("manualBreak"), options.onManualBreak)
  };
};
var createEndDialog = (root, options) => {
  const endDialog = root.createDiv({ cls: "rough-pomodoro-dialog" });
  endDialog.hidden = true;
  const endCard = endDialog.createDiv();
  endCard.createEl("b", { text: options.t("endTitle") });
  const done = endCard.createEl("button", { text: options.t("completed") }), interrupted = endCard.createEl("button", { text: options.t("interrupted") }), reason = endCard.createEl("textarea");
  reason.placeholder = options.t("interruptPlaceholder");
  const save = endCard.createEl("button", { text: options.t("recordAndEnd") }), cancel = endCard.createEl("button", { text: options.t("cancel") });
  done.onclick = () => options.onComplete("completed");
  interrupted.onclick = () => {
    reason.hidden = false;
    save.hidden = false;
  };
  reason.hidden = true;
  save.hidden = true;
  save.onclick = () => options.onComplete("interrupted", reason.value);
  cancel.onclick = () => endDialog.hidden = true;
  return {
    endDialog,
    endError: endCard.createDiv()
  };
};
var createPomodoroPanel = (document, options) => {
  const root = document.body.createDiv({ cls: "rough-pomodoro-overlay" });
  const card = root.createDiv({ cls: "rough-pomodoro-card" });
  return {
    root,
    task: createHeaderAndTask(card, root, options),
    ...createHero(card),
    ...createSettings(card, options),
    ...createActions(card, options),
    error: card.createDiv({ cls: "rough-pomodoro-error" }),
    ...createEndDialog(root, options)
  };
};

// i18n.ts
var import_obsidian2 = require("obsidian");

// locales/en-US.json
var en_US_default = {
  open: "Open Pomodoro",
  settingsDescription: "Open the timer from the command palette or ribbon icon.",
  saveState: "Could not save timer state: {error}",
  audioUnavailable: "Audio is not available in this environment.",
  audioNotRunning: "Could not enable audio.",
  audioLocked: "Audio is not enabled. Press \u201CPreview sound\u201D first.",
  alarmContinues: ". The timer will continue.",
  folderConflict: "The log path conflicts with a file: {path}",
  invalidLogFolder: "Log folder must stay inside the vault; '..' is not allowed.",
  logSave: "Could not save the work log. Try again: {error}",
  taskRequired: "Enter what you are going to work on.",
  audioStart: "Could not enable audio. The timer will start anyway: {error}",
  interruptRequired: "Enter an interrupt description.",
  task: "Task",
  timerSettings: "Timer and log settings",
  focusMinutes: "Focus time (minutes)",
  breakMinutes: "Break time (minutes)",
  volume: "Volume",
  logFolder: "Log folder",
  start: "\u25B6\uFE0F Start",
  finish: "\u23F9\uFE0F End",
  manualBreak: "\u{1F33F} Start break",
  preview: "\u{1F50A} Preview sound",
  endTitle: "Session result",
  completed: "\u2705 Completed",
  interrupted: "\u2197\uFE0F Interrupted",
  interruptPlaceholder: "Interrupt description (required)",
  recordAndEnd: "Log and end",
  cancel: "Cancel",
  pureBreak: "Taking a break",
  currentTask: "Current task: {task}",
  completedTask: "Focus complete: {task}",
  enterTask: "Enter a specific task to get started",
  focusing: "\u{1F345} Focusing",
  overtime: "\u23F1\uFE0F Overtime",
  plannedEnd: "Planned end {time}",
  focusEnd: "Ends at {time}",
  breakEnd: "Break ends {time}",
  resting: "\u{1F33F} Resting",
  finishBreak: "Press end break when you are ready",
  breakResting: "\u2615 Resting",
  breakOvertime: "\u2615 Break overtime",
  waiting: "\u{1F33F} Waiting",
  ready: "Start focusing when you are ready",
  nextFocus: "\u25B6\uFE0F Start next focus",
  measuring: "\u23F3 Running"
};

// locales/ja-JP.json
var ja_JP_default = {
  open: "\u30DD\u30E2\u30C9\u30FC\u30ED\u3092\u958B\u304F",
  settingsDescription: "\u30B3\u30DE\u30F3\u30C9\u30D1\u30EC\u30C3\u30C8\u307E\u305F\u306F\u30EA\u30DC\u30F3\u30A2\u30A4\u30B3\u30F3\u304B\u3089\u30BF\u30A4\u30DE\u30FC\u3092\u958B\u304D\u307E\u3059\u3002",
  saveState: "\u30BF\u30A4\u30DE\u30FC\u72B6\u614B\u3092\u4FDD\u5B58\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F: {error}",
  audioUnavailable: "\u3053\u306E\u74B0\u5883\u3067\u306F\u97F3\u58F0\u3092\u5229\u7528\u3067\u304D\u307E\u305B\u3093\u3002",
  audioNotRunning: "\u97F3\u58F0\u3092\u6709\u52B9\u5316\u3067\u304D\u307E\u305B\u3093\u3002",
  audioLocked: "\u97F3\u58F0\u304C\u672A\u6709\u52B9\u3067\u3059\u3002\u300C\u97F3\u3092\u8A66\u8074\u300D\u3092\u62BC\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  alarmContinues: "\u3002\u8A08\u6E2C\u306F\u7D99\u7D9A\u3057\u307E\u3059",
  folderConflict: "\u4FDD\u5B58\u5148\u304C\u30D5\u30A1\u30A4\u30EB\u3068\u885D\u7A81\u3057\u3066\u3044\u307E\u3059: {path}",
  invalidLogFolder: "\u30ED\u30B0\u4FDD\u5B58\u5148\u306B\u306FVault\u5185\u306E\u76F8\u5BFE\u30D1\u30B9\u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u300C..\u300D\u306F\u4F7F\u7528\u3067\u304D\u307E\u305B\u3093\u3002",
  logSave: "\u4F5C\u696D\u30ED\u30B0\u3092\u4FDD\u5B58\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044: {error}",
  taskRequired: "\u4F5C\u696D\u5185\u5BB9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  audioStart: "\u97F3\u58F0\u3092\u6709\u52B9\u5316\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u30BF\u30A4\u30DE\u30FC\u306F\u958B\u59CB\u3057\u307E\u3059: {error}",
  interruptRequired: "\u30A4\u30F3\u30BF\u30E9\u30D7\u30C8\u5185\u5BB9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  task: "\u4F5C\u696D\u5185\u5BB9",
  timerSettings: "\u30BF\u30A4\u30DE\u30FC\u30FB\u30ED\u30B0\u8A2D\u5B9A",
  focusMinutes: "\u96C6\u4E2D\u6642\u9593\uFF08\u5206\uFF09",
  breakMinutes: "\u4F11\u61A9\u6642\u9593\uFF08\u5206\uFF09",
  volume: "\u97F3\u91CF",
  logFolder: "\u30ED\u30B0\u4FDD\u5B58\u5148\u30D5\u30A9\u30EB\u30C0",
  start: "\u25B6\uFE0F \u958B\u59CB",
  finish: "\u23F9\uFE0F \u7D42\u4E86",
  manualBreak: "\u{1F33F} \u4F11\u61A9\u958B\u59CB",
  preview: "\u{1F50A} \u97F3\u3092\u8A66\u8074",
  endTitle: "\u7D42\u4E86\u6642\u306E\u7D50\u679C",
  completed: "\u2705 \u5B8C\u4E86",
  interrupted: "\u2197\uFE0F \u30A4\u30F3\u30BF\u30E9\u30D7\u30C8",
  interruptPlaceholder: "\u30A4\u30F3\u30BF\u30E9\u30D7\u30C8\u5185\u5BB9\uFF08\u5FC5\u9808\uFF09",
  recordAndEnd: "\u8A18\u9332\u3057\u3066\u7D42\u4E86",
  cancel: "\u30AD\u30E3\u30F3\u30BB\u30EB",
  pureBreak: "\u7D14\u7C8B\u306A\u4F11\u61A9\u4E2D",
  currentTask: "\u4ECA\u3084\u308B\u3053\u3068: {task}",
  completedTask: "\u96C6\u4E2D\u7D42\u4E86: {task}",
  enterTask: "\u4ECA\u3084\u308B\u3053\u3068\u3092\u5177\u4F53\u7684\u306B\u5165\u529B\u3057\u3066\u958B\u59CB\u3057\u3066\u304F\u3060\u3055\u3044",
  focusing: "\u{1F345} \u96C6\u4E2D\u4E2D",
  overtime: "\u23F1\uFE0F \u8D85\u904E\u4E2D",
  plannedEnd: "\u4E88\u5B9A\u7D42\u4E86 {time}",
  focusEnd: "\u7D42\u4E86\u4E88\u5B9A {time}",
  breakEnd: "\u4F11\u61A9\u7D42\u4E86 {time}",
  resting: "\u{1F33F} \u4F11\u61A9\u4E2D",
  finishBreak: "\u7D42\u4E86\u3057\u305F\u3089\u4F11\u61A9\u7D42\u4E86\u3092\u62BC\u3059",
  breakResting: "\u2615 \u4F11\u61A9\u4E2D",
  breakOvertime: "\u2615 \u4F11\u61A9\u8D85\u904E\u4E2D",
  waiting: "\u{1F33F} \u5F85\u6A5F\u4E2D",
  ready: "\u59CB\u3081\u308B\u6E96\u5099\u304C\u3067\u304D\u305F\u3089\u3001\u96C6\u4E2D\u958B\u59CB",
  nextFocus: "\u25B6\uFE0F \u6B21\u306E\u96C6\u4E2D\u3092\u958B\u59CB",
  measuring: "\u23F3 \u8A08\u6E2C\u4E2D"
};

// i18n.ts
var messages = {
  "ja-JP": ja_JP_default,
  "en-US": en_US_default
};
var detectLocale = () => {
  const language = (0, import_obsidian2.requireApiVersion)("1.8.7") ? (0, import_obsidian2.getLanguage)() : import_obsidian2.moment.locale();
  return language.toLowerCase().startsWith("ja") ? "ja-JP" : "en-US";
};
function loadMessages(locale) {
  return messages[locale];
}

// pomodoro.ts
var DEFAULTS = {
  version: 1,
  settings: {
    focusMinutes: 25,
    breakMinutes: 5,
    volume: 0.6,
    logFolder: "Pomodoro"
  }
};
var pad2 = (value) => String(value).padStart(2, "0");
var dateOf = (timestamp) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};
var timeOf2 = (timestamp) => {
  const date = new Date(timestamp);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
};
var dateTimeOf = (timestamp) => `${dateOf(timestamp)} ${timeOf2(timestamp)}`;
var clean = (value) => value.replace(/\r?\n/g, " / ").replace(/::/g, ":").replace(/\[/g, "(").replace(/\]/g, ")");
var isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var isPomodoroSession = (value) => {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.startedAt !== "number") {
    return false;
  }
  if (value.type === "work") {
    return (value.phase === "focus" || value.phase === "overtime") && typeof value.task === "string" && (value.outcome === "" || value.outcome === "completed" || value.outcome === "interrupted") && typeof value.plannedEndsAt === "number" && typeof value.focusDurationMs === "number";
  }
  return value.type === "break" && (value.phase === "manualBreak" || value.phase === "break" || value.phase === "breakDone") && (value.mode === void 0 || value.mode === "manual") && (value.task === void 0 || typeof value.task === "string") && (value.endsAt === void 0 || typeof value.endsAt === "number") && (value.breakDurationMs === void 0 || typeof value.breakDurationMs === "number");
};
var isPomodoroLog = (value) => isRecord(value) && typeof value.id === "string" && typeof value.path === "string" && typeof value.marker === "string" && typeof value.markdown === "string";
var normalizeLogFolder = (path) => {
  const segments = path.trim().replace(/\\/g, "/").split("/");
  if (segments.some((segment) => segment.trim() === "..")) return null;
  return segments.filter((segment) => segment && segment !== ".").join("/");
};
var isSafeLogPath = (path) => {
  const normalized = normalizeLogFolder(path);
  return normalized !== null && normalized === path && path.length > 0;
};
var normalizePomodoroState = (saved) => {
  const data = isRecord(saved) ? saved : {};
  const settings = isRecord(data.settings) ? data.settings : {};
  const completedWork = isRecord(data.completedWork) ? data.completedWork : null;
  return {
    version: DEFAULTS.version,
    settings: {
      focusMinutes: typeof settings.focusMinutes === "number" ? settings.focusMinutes : DEFAULTS.settings.focusMinutes,
      breakMinutes: typeof settings.breakMinutes === "number" ? settings.breakMinutes : DEFAULTS.settings.breakMinutes,
      volume: typeof settings.volume === "number" ? settings.volume : DEFAULTS.settings.volume,
      logFolder: typeof settings.logFolder === "string" ? normalizeLogFolder(settings.logFolder) ?? DEFAULTS.settings.logFolder : DEFAULTS.settings.logFolder
    },
    task: typeof data.task === "string" ? data.task : "",
    lastTask: typeof data.lastTask === "string" ? data.lastTask : "",
    session: isPomodoroSession(data.session) ? data.session : null,
    completedWork: completedWork && typeof completedWork.task === "string" && typeof completedWork.endedAt === "number" ? { task: completedWork.task, endedAt: completedWork.endedAt } : null,
    pendingLogs: Array.isArray(data.pendingLogs) ? data.pendingLogs.filter(isPomodoroLog) : []
  };
};
var createLog = (state, sessionId, timestamp, row) => {
  const marker = `[Session:: ${sessionId}]`;
  return {
    id: sessionId,
    path: [state.settings.logFolder, `${dateOf(timestamp)}.md`].filter(Boolean).join("/"),
    marker,
    markdown: `${row}
`
  };
};
var createWorkLog = (state, session, end, outcome, note, endedBy) => {
  const scheduled = Math.floor(
    (session.focusDurationMs || session.plannedEndsAt - session.startedAt) / 1e3
  ), total = Math.floor((end - session.startedAt) / 1e3);
  const row = [
    `- \u{1F345} Focus [Task:: ${clean(session.task)}]`,
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
    ...note ? [`[WorkNote:: ${clean(note)}]`] : [],
    `[Planned:: ${scheduled}]`,
    `[Offset:: ${-new Date(session.startedAt).getTimezoneOffset()}]`
  ].join(" ");
  return createLog(state, session.id, end, row);
};
var createBreakLog = (state, session, end, endedBy = "stop") => {
  const manual = session.mode === "manual", scheduled = manual ? null : Math.floor(
    (session.breakDurationMs || session.endsAt - session.startedAt) / 1e3
  ), total = Math.floor((end - session.startedAt) / 1e3);
  const row = [
    `${manual ? "- \u{1F33F} Rest" : "- \u2615 Rest"} [Start:: ${dateTimeOf(session.startedAt)}]`,
    `[End:: ${dateTimeOf(end)}]`,
    ...manual ? [] : [`[Scheduled:: ${scheduled}]`],
    `[Total:: ${total}]`,
    ...manual ? [] : [`[Overtime:: ${Math.max(0, total - scheduled)}]`],
    `[Type:: ${manual ? "manual-break" : "short-break"}]`,
    `[Session:: ${session.id}]`,
    `[StartedBy:: start]`,
    `[EndedBy:: ${endedBy}]`,
    ...manual ? [] : [`[Planned:: ${scheduled}]`]
  ].join(" ");
  return createLog(state, session.id, session.startedAt, row);
};
var startWorkSession = (state, task, now, sessionId) => {
  const completedBreakLog = state.session?.phase === "breakDone" ? createBreakLog(state, state.session, now, "time-up") : null;
  const duration = Number(state.settings.focusMinutes) * 6e4;
  state.session = {
    id: sessionId,
    type: "work",
    phase: "focus",
    task,
    outcome: "",
    startedAt: now,
    plannedEndsAt: now + duration,
    focusDurationMs: duration
  };
  state.lastTask = task;
  return completedBreakLog;
};
var startManualBreakSession = (state, sessionId, now) => {
  state.session = {
    id: sessionId,
    type: "break",
    mode: "manual",
    phase: "manualBreak",
    startedAt: now
  };
};
var endBreakSession = (state, now) => {
  const session = state.session;
  if (!session || session.type !== "break") return false;
  state.pendingLogs.push(createBreakLog(state, session, now));
  state.session = null;
  state.completedWork = null;
  return true;
};
var completeWorkSession = (state, outcome, note, now, createSessionId) => {
  const session = state.session;
  if (!session || session.type !== "work") return false;
  state.pendingLogs.push(
    createWorkLog(
      state,
      session,
      now,
      outcome,
      note,
      outcome === "interrupted" ? "interrupt" : "stop"
    )
  );
  state.session = null;
  if (outcome === "completed") {
    state.completedWork = { task: session.task, endedAt: now };
    const duration = Number(state.settings.breakMinutes) * 6e4;
    state.session = {
      id: createSessionId(),
      type: "break",
      phase: "break",
      task: session.task,
      startedAt: now,
      endsAt: now + duration,
      breakDurationMs: duration
    };
  } else {
    state.completedWork = null;
  }
  return true;
};
var advanceSession = (state, now) => {
  const session = state.session;
  if (session?.type === "work" && session.phase === "focus" && now >= session.plannedEndsAt) {
    session.phase = "overtime";
    return "work";
  }
  if (session?.type === "break" && session.phase === "break" && now >= session.endsAt) {
    session.phase = "breakDone";
    return "break";
  }
  return null;
};

// main.ts
var id = () => (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`).replace(/[^a-z0-9]/gi, "").slice(-10).toLowerCase();
var errorMessage = (error) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error === null) return "null";
  if (typeof error !== "object") return "Unknown error";
  try {
    return JSON.stringify(error) ?? "Unknown error";
  } catch {
    return "Unknown error";
  }
};
var Pomodoro = class extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    this.panel = null;
    this.alarm = null;
    this.audio = null;
    this.locale = detectLocale();
    this.messages = {};
  }
  t(key, values = {}) {
    let message = this.messages[key] || key;
    for (const [name, value] of Object.entries(values)) {
      message = message.replace(`{${name}}`, String(value));
    }
    return message;
  }
  async onload() {
    this.locale = detectLocale();
    this.messages = loadMessages(this.locale);
    this.state = normalizePomodoroState(await this.loadData());
    this.registerOpenActions();
    this.startTicker();
    this.tick();
    void this.flush();
  }
  registerOpenActions() {
    this.addCommand({
      id: "open",
      name: this.t("open"),
      callback: () => this.open()
    });
    this.addRibbonIcon("clock", this.t("open"), () => this.open());
    this.addSettingTab(new PomodoroSettings(this.app, this));
  }
  startTicker() {
    this.registerInterval(window.setInterval(() => this.tick(), 1e3));
  }
  onunload() {
    this.stopAlarm();
    this.panel?.root.remove();
    this.panel = null;
  }
  async persist() {
    try {
      await this.saveData(this.state);
    } catch (error) {
      new import_obsidian3.Notice(this.t("saveState", { error: errorMessage(error) }));
    }
  }
  notice(message) {
    new import_obsidian3.Notice(message);
    if (this.panel?.error) this.panel.error.textContent = message;
  }
  async unlockAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw Error(this.t("audioUnavailable"));
    this.audio ||= new AudioContextClass();
    await this.audio.resume();
    if (this.audio.state !== "running") throw Error(this.t("audioNotRunning"));
  }
  sound() {
    if (!this.audio || this.audio.state !== "running")
      throw Error(this.t("audioLocked"));
    const start = this.audio.currentTime + 0.02;
    [880, 1046.5, 880, 1046.5].forEach((f, i) => {
      const t = start + i * 0.22, o = this.audio.createOscillator(), g = this.audio.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(this.state.settings.volume * 0.6, t + 0.012);
      g.gain.linearRampToValueAtTime(0, t + 0.13);
      o.connect(g);
      g.connect(this.audio.destination);
      o.start(t);
      o.stop(t + 0.14);
    });
  }
  async previewSound() {
    try {
      await this.unlockAudio();
      this.sound();
    } catch (error) {
      this.notice(errorMessage(error));
    }
  }
  startAlarm() {
    if (this.alarm) return;
    try {
      this.sound();
    } catch (error) {
      this.notice(`${errorMessage(error)}${this.t("alarmContinues")}`);
    }
    this.alarm = window.setInterval(() => {
      try {
        this.sound();
      } catch (error) {
        void error;
      }
    }, 1200);
  }
  stopAlarm() {
    if (this.alarm) {
      window.clearInterval(this.alarm);
      this.alarm = null;
    }
  }
  async ensureFolder(path) {
    let current = "";
    for (const part of path.split("/")) {
      current = current ? `${current}/${part}` : part;
      const f = this.app.vault.getAbstractFileByPath(current);
      if (f) {
        if (!(f instanceof import_obsidian3.TFolder))
          throw Error(this.t("folderConflict", { path: current }));
      } else await this.app.vault.createFolder(current);
    }
  }
  async append(log) {
    if (!isSafeLogPath(log.path)) throw Error(this.t("invalidLogFolder"));
    const separator = log.path.lastIndexOf("/");
    const folder = separator === -1 ? "" : log.path.slice(0, separator);
    if (folder) await this.ensureFolder(folder);
    const f = this.app.vault.getAbstractFileByPath(log.path);
    if (f instanceof import_obsidian3.TFile) {
      const c = await this.app.vault.cachedRead(f);
      if (!c.includes(log.marker))
        await this.app.vault.modify(
          f,
          `${c}${c && !c.endsWith("\n") ? "\n" : ""}
${log.markdown}`
        );
    } else await this.app.vault.create(log.path, log.markdown);
  }
  async flush() {
    if (!this.state.pendingLogs.length) return;
    while (this.state.pendingLogs.length) {
      try {
        await this.append(this.state.pendingLogs[0]);
        this.state.pendingLogs.shift();
        await this.persist();
      } catch (error) {
        this.notice(this.t("logSave", { error: errorMessage(error) }));
        return;
      }
    }
    this.render();
  }
  async startWork() {
    if (this.state.session && this.state.session.phase !== "breakDone") return;
    const task = this.state.task.trim();
    if (!task) return this.notice(this.t("taskRequired"));
    try {
      await this.unlockAudio();
    } catch (error) {
      this.notice(this.t("audioStart", { error: errorMessage(error) }));
    }
    const now = Date.now();
    const completedBreakLog = startWorkSession(this.state, task, now, id());
    if (completedBreakLog) {
      this.stopAlarm();
      this.state.pendingLogs.push(completedBreakLog);
    }
    await this.persist();
    this.render();
    void this.flush();
  }
  startManualBreak() {
    if (this.state.session) return;
    startManualBreakSession(this.state, id(), Date.now());
    void this.persist();
    this.render();
  }
  end() {
    const s = this.state.session;
    if (!s) return;
    if (s.type === "work") return this.showEnd();
    endBreakSession(this.state, Date.now());
    this.stopAlarm();
    void this.persist();
    this.render();
    void this.flush();
  }
  showEnd() {
    const panel = this.panel;
    if (!panel) return;
    panel.endDialog.hidden = false;
  }
  complete(outcome, note = "") {
    const s = this.state.session;
    if (!s || s.type !== "work") return;
    const panel = this.panel;
    if (!panel) return;
    if (outcome === "interrupted" && !note.trim()) {
      panel.endError.textContent = this.t("interruptRequired");
      return;
    }
    if (!completeWorkSession(this.state, outcome, note, Date.now(), id)) return;
    this.stopAlarm();
    panel.endDialog.hidden = true;
    void this.persist();
    this.render();
    void this.flush();
  }
  tick() {
    if (advanceSession(this.state, Date.now())) {
      void this.persist();
      this.startAlarm();
    }
    this.render();
  }
  updateSetting(key, value) {
    if (key === "logFolder") {
      const logFolder = normalizeLogFolder(value);
      if (logFolder === null) {
        this.notice(this.t("invalidLogFolder"));
        return null;
      }
      this.state.settings.logFolder = logFolder;
    } else {
      this.state.settings[key] = Number(value);
    }
    void this.persist();
    return this.state.settings[key];
  }
  open() {
    if (this.panel?.root?.isConnected) return;
    this.panel = createPomodoroPanel(this.app.workspace.containerEl.ownerDocument, {
      task: this.state.task,
      settings: this.state.settings,
      t: (key, values) => this.t(key, values),
      onTaskInput: (task) => {
        this.state.task = task;
        void this.persist();
      },
      onSettingChange: (key, value) => this.updateSetting(key, value),
      onStart: () => {
        void this.startWork();
      },
      onEnd: () => this.end(),
      onManualBreak: () => this.startManualBreak(),
      onPreview: () => {
        void this.previewSound();
      },
      onComplete: (outcome, note) => this.complete(outcome, note)
    });
    this.render();
  }
  render() {
    const p = this.panel;
    if (!p || !p.root.isConnected) return;
    const s = this.state.session;
    const now = Date.now();
    const deadlineDisplay = (stateKey, endKey, deadline, overtime = false) => timerDisplay(
      this.t(stateKey),
      overtime ? now - deadline : deadline - now,
      this.t(endKey, { time: timeOf(deadline) }),
      overtime
    );
    const elapsedDisplay = (stateKey, startedAt, endKey) => timerDisplay(this.t(stateKey), now - startedAt, this.t(endKey));
    p.task.value = s?.type === "work" || s?.phase === "break" ? s.task ?? this.state.task : this.state.task;
    let display = {
      state: this.t("waiting"),
      timer: "--:--",
      end: this.t("ready")
    };
    switch (s?.type) {
      case "work":
        p.label.textContent = this.t("currentTask", {
          task: s.task || this.t("breakResting")
        });
        if (s.phase === "focus") {
          display = deadlineDisplay("focusing", "focusEnd", s.plannedEndsAt);
        } else {
          display = deadlineDisplay("overtime", "plannedEnd", s.plannedEndsAt, true);
        }
        break;
      case "break":
        p.label.textContent = s.mode === "manual" ? this.t("pureBreak") : this.t("currentTask", {
          task: s.task || this.t("breakResting")
        });
        if (s.mode === "manual") {
          display = elapsedDisplay("resting", s.startedAt, "finishBreak");
        } else if (s.phase === "break") {
          display = deadlineDisplay("breakResting", "breakEnd", s.endsAt);
        } else {
          display = deadlineDisplay("breakOvertime", "plannedEnd", s.endsAt, true);
        }
        break;
      default:
        p.label.textContent = this.state.completedWork ? this.t("completedTask", { task: this.state.completedWork.task }) : this.t("enterTask");
    }
    p.state.textContent = display.state;
    p.timer.textContent = display.timer;
    p.end.textContent = display.end;
    p.start.disabled = s !== null && s.phase !== "breakDone";
    p.finish.disabled = s === null;
    p.manual.disabled = s !== null;
    p.start.textContent = s?.phase === "breakDone" ? this.t("nextFocus") : s ? this.t("measuring") : this.t("start");
  }
};
var PomodoroSettings = class extends import_obsidian3.PluginSettingTab {
  constructor(app, pomodoro) {
    super(app, pomodoro);
    this.pomodoro = pomodoro;
  }
  getSettingDefinitions() {
    return [
      {
        name: this.pomodoro.t("open"),
        desc: this.pomodoro.t("settingsDescription"),
        action: () => this.pomodoro.open()
      }
    ];
  }
  display() {
    this.containerEl.empty();
    new import_obsidian3.Setting(this.containerEl).setName(this.pomodoro.t("open")).setDesc(this.pomodoro.t("settingsDescription"));
  }
};
