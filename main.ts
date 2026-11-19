import {
  App,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  TFolder,
  type SettingDefinitionItem,
} from "obsidian";
import { createPomodoroPanel, type PomodoroPanel } from "./components";
import { detectLocale, loadMessages, type Locale, type Messages } from "./i18n";
import { timeOf, timerDisplay } from "./timer";
import {
  advanceSession,
  completeWorkSession,
  endBreakSession,
  isSafeLogPath,
  normalizeLogFolder,
  normalizePomodoroState,
  startManualBreakSession,
  startWorkSession,
  type PomodoroConfig,
  type PomodoroLog,
  type PomodoroState,
  type WorkSession,
} from "./pomodoro";

const id = () =>
  (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`)
    .replace(/[^a-z0-9]/gi, "")
    .slice(-10)
    .toLowerCase();

const errorMessage = (error: unknown): string => {
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

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export default class Pomodoro extends Plugin {
  state: PomodoroState;
  panel: PomodoroPanel | null = null;
  alarm: number | null = null;
  audio: AudioContext | null = null;
  locale: Locale = detectLocale();
  messages: Messages = {};

  t(key: string, values: Record<string, string | number> = {}): string {
    let message = this.messages[key] || key;
    for (const [name, value] of Object.entries(values)) {
      message = message.replace(`{${name}}`, String(value));
    }
    return message;
  }

  async onload(): Promise<void> {
    this.locale = detectLocale();
    this.messages = loadMessages(this.locale);
    this.state = normalizePomodoroState(await this.loadData());
    this.registerOpenActions();
    this.startTicker();
    this.tick();
    void this.flush();
  }

  private registerOpenActions() {
    this.addCommand({
      id: "open",
      name: this.t("open"),
      callback: () => this.open(),
    });
    this.addRibbonIcon("clock", this.t("open"), () => this.open());
    this.addSettingTab(new PomodoroSettings(this.app, this));
  }

  private startTicker() {
    this.registerInterval(window.setInterval(() => this.tick(), 1000));
  }

  onunload(): void {
    this.stopAlarm();
    this.panel?.root.remove();
    this.panel = null;
  }
  async persist(): Promise<void> {
    try {
      await this.saveData(this.state);
    } catch (error) {
      new Notice(this.t("saveState", { error: errorMessage(error) }));
    }
  }

  notice(message: string): void {
    new Notice(message);
    if (this.panel?.error) this.panel.error.textContent = message;
  }

  async unlockAudio(): Promise<void> {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw Error(this.t("audioUnavailable"));
    this.audio ||= new AudioContextClass();
    await this.audio.resume();
    if (this.audio.state !== "running") throw Error(this.t("audioNotRunning"));
  }
  sound(): void {
    if (!this.audio || this.audio.state !== "running")
      throw Error(this.t("audioLocked"));
    const start = this.audio.currentTime + 0.02;
    [880, 1046.5, 880, 1046.5].forEach((f, i) => {
      const t = start + i * 0.22,
        o = this.audio.createOscillator(),
        g = this.audio.createGain();
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
  private async previewSound(): Promise<void> {
    try {
      await this.unlockAudio();
      this.sound();
    } catch (error) {
      this.notice(errorMessage(error));
    }
  }
  startAlarm(): void {
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
  stopAlarm(): void {
    if (this.alarm) {
      window.clearInterval(this.alarm);
      this.alarm = null;
    }
  }
  async ensureFolder(path: string): Promise<void> {
    let current = "";
    for (const part of path.split("/")) {
      current = current ? `${current}/${part}` : part;
      const f = this.app.vault.getAbstractFileByPath(current);
      if (f) {
        if (!(f instanceof TFolder))
          throw Error(this.t("folderConflict", { path: current }));
      } else await this.app.vault.createFolder(current);
    }
  }
  async append(log: PomodoroLog): Promise<void> {
    if (!isSafeLogPath(log.path)) throw Error(this.t("invalidLogFolder"));
    const separator = log.path.lastIndexOf("/");
    const folder = separator === -1 ? "" : log.path.slice(0, separator);
    if (folder) await this.ensureFolder(folder);
    const f = this.app.vault.getAbstractFileByPath(log.path);
    if (f instanceof TFile) {
      const c = await this.app.vault.cachedRead(f);
      if (!c.includes(log.marker))
        await this.app.vault.modify(
          f,
          `${c}${c && !c.endsWith("\n") ? "\n" : ""}\n${log.markdown}`,
        );
    } else await this.app.vault.create(log.path, log.markdown);
  }
  async flush(): Promise<void> {
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
  async startWork(): Promise<void> {
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
  startManualBreak(): void {
    if (this.state.session) return;
    startManualBreakSession(this.state, id(), Date.now());
    void this.persist();
    this.render();
  }
  end(): void {
    const s = this.state.session;
    if (!s) return;
    if (s.type === "work") return this.showEnd();
    endBreakSession(this.state, Date.now());
    this.stopAlarm();
    void this.persist();
    this.render();
    void this.flush();
  }
  showEnd(): void {
    const panel = this.panel;
    if (!panel) return;
    panel.endDialog.hidden = false;
  }
  complete(outcome: WorkSession["outcome"], note = ""): void {
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
  tick(): void {
    if (advanceSession(this.state, Date.now())) {
      void this.persist();
      this.startAlarm();
    }
    this.render();
  }
  private updateSetting(
    key: keyof PomodoroConfig,
    value: string,
  ): string | number | null {
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

  open(): void {
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
      onComplete: (outcome, note) => this.complete(outcome, note),
    });
    this.render();
  }
  render(): void {
    const p = this.panel;
    if (!p || !p.root.isConnected) return;
    const s = this.state.session;
    const now = Date.now();
    const deadlineDisplay = (
      stateKey: string,
      endKey: string,
      deadline: number,
      overtime = false,
    ) =>
      timerDisplay(
        this.t(stateKey),
        overtime ? now - deadline : deadline - now,
        this.t(endKey, { time: timeOf(deadline) }),
        overtime,
      );
    const elapsedDisplay = (stateKey: string, startedAt: number, endKey: string) =>
      timerDisplay(this.t(stateKey), now - startedAt, this.t(endKey));
    p.task.value =
      s?.type === "work" || s?.phase === "break"
        ? (s.task ?? this.state.task)
        : this.state.task;
    let display = {
      state: this.t("waiting"),
      timer: "--:--",
      end: this.t("ready"),
    };

    switch (s?.type) {
      case "work":
        p.label.textContent = this.t("currentTask", {
          task: s.task || this.t("breakResting"),
        });
        if (s.phase === "focus") {
          display = deadlineDisplay("focusing", "focusEnd", s.plannedEndsAt);
        } else {
          display = deadlineDisplay("overtime", "plannedEnd", s.plannedEndsAt, true);
        }
        break;
      case "break":
        p.label.textContent =
          s.mode === "manual"
            ? this.t("pureBreak")
            : this.t("currentTask", {
                task: s.task || this.t("breakResting"),
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
        p.label.textContent = this.state.completedWork
          ? this.t("completedTask", { task: this.state.completedWork.task })
          : this.t("enterTask");
    }
    p.state.textContent = display.state;
    p.timer.textContent = display.timer;
    p.end.textContent = display.end;

    p.start.disabled = s !== null && s.phase !== "breakDone";
    p.finish.disabled = s === null;
    p.manual.disabled = s !== null;
    p.start.textContent =
      s?.phase === "breakDone"
        ? this.t("nextFocus")
        : s
          ? this.t("measuring")
          : this.t("start");
  }
}

class PomodoroSettings extends PluginSettingTab {
  constructor(
    app: App,
    private readonly pomodoro: Pomodoro,
  ) {
    super(app, pomodoro);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        name: this.pomodoro.t("open"),
        desc: this.pomodoro.t("settingsDescription"),
        action: () => this.pomodoro.open(),
      },
    ];
  }

  display() {
    this.containerEl.empty();
    new Setting(this.containerEl)
      .setName(this.pomodoro.t("open"))
      .setDesc(this.pomodoro.t("settingsDescription"));
  }
}
