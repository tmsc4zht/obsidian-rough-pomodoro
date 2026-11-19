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
var import_obsidian2 = require("obsidian");

// i18n.ts
var import_obsidian = require("obsidian");
var detectLocale = () => (navigator.language || "en-US").toLowerCase().startsWith("ja") ? "ja-JP" : "en-US";
async function loadMessages(adapter, pluginDir, locale) {
  const read = async (name) => JSON.parse(
    await adapter.read((0, import_obsidian.normalizePath)(`${pluginDir}/locales/${name}.json`))
  );
  try {
    return await read(locale);
  } catch {
    return locale === "en-US" ? {} : read("en-US");
  }
}

// main.ts
var DEFAULTS = {
  version: 1,
  settings: {
    focusMinutes: 25,
    breakMinutes: 5,
    volume: 0.6,
    logFolder: "Pomodoro"
  },
  task: "",
  lastTask: "",
  session: null,
  completedWork: null,
  pendingLogs: []
};
var pad = (n) => String(n).padStart(2, "0");
var dateOf = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
var timeOf = (t) => {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
var dateTimeOf = (t) => `${dateOf(t)} ${timeOf(t)}`;
var clock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1e3));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
};
var id = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`).replace(/[^a-z0-9]/gi, "").slice(-10).toLowerCase();
var clean = (value) => String(value || "").replace(/\r?\n/g, " / ").replace(/::/g, ":").replace(/\[/g, "(").replace(/\]/g, ")");
var Pomodoro = class extends import_obsidian2.Plugin {
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
    this.messages = await loadMessages(
      this.app.vault.adapter,
      this.manifest.dir,
      this.locale
    );
    this.state = this.normalize(await this.loadData());
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
  normalize(saved) {
    const data = saved || {};
    return {
      version: DEFAULTS.version,
      settings: { ...DEFAULTS.settings, ...data.settings || {} },
      task: data.task || "",
      lastTask: data.lastTask || "",
      session: data.session || null,
      completedWork: data.completedWork || null,
      pendingLogs: Array.isArray(data.pendingLogs) ? data.pendingLogs : []
    };
  }
  async persist() {
    try {
      await this.saveData(this.state);
    } catch (e) {
      new import_obsidian2.Notice(this.t("saveState", { error: e.message }));
    }
  }
  notice(message) {
    new import_obsidian2.Notice(message);
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
  startAlarm() {
    if (this.alarm) return;
    try {
      this.sound();
    } catch (e) {
      this.notice(`${e.message}${this.t("alarmContinues")}`);
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
        if (!(f instanceof import_obsidian2.TFolder))
          throw Error(this.t("folderConflict", { path: current }));
      } else await this.app.vault.createFolder(current);
    }
  }
  async append(log) {
    await this.ensureFolder(log.path.slice(0, log.path.lastIndexOf("/")));
    const f = this.app.vault.getAbstractFileByPath(log.path);
    if (f instanceof import_obsidian2.TFile) {
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
      } catch (e) {
        this.notice(this.t("logSave", { error: e.message }));
        return;
      }
    }
    this.render();
  }
  workLog(s, end, outcome, note, endedBy) {
    const scheduled = Math.floor(
      (s.focusDurationMs || s.plannedEndsAt - s.startedAt) / 1e3
    ), total = Math.floor((end - s.startedAt) / 1e3);
    const row = [
      `- \u{1F345} Focus [Task:: ${clean(s.task)}]`,
      `[Start:: ${dateTimeOf(s.startedAt)}]`,
      `[End:: ${dateTimeOf(end)}]`,
      `[Scheduled:: ${scheduled}]`,
      `[Total:: ${total}]`,
      `[Status:: ${outcome === "interrupted" ? "interrupted" : "finished"}]`,
      `[Type:: focus]`,
      `[Overtime:: ${Math.max(0, total - scheduled)}]`,
      `[Session:: ${s.id}]`,
      `[StartedBy:: start]`,
      `[EndedBy:: ${endedBy}]`,
      `[Outcome:: ${outcome}]`,
      ...note ? [`[WorkNote:: ${clean(note)}]`] : [],
      `[Planned:: ${scheduled}]`,
      `[Offset:: ${-new Date(s.startedAt).getTimezoneOffset()}]`
    ].join(" ");
    return this.log(s.id, end, row);
  }
  breakLog(s, end, endedBy = "stop") {
    const manual = s.mode === "manual", scheduled = manual ? null : Math.floor((s.breakDurationMs || s.endsAt - s.startedAt) / 1e3), total = Math.floor((end - s.startedAt) / 1e3);
    const row = [
      `${manual ? "- \u{1F33F} Rest" : "- \u2615 Rest"} [Start:: ${dateTimeOf(s.startedAt)}]`,
      `[End:: ${dateTimeOf(end)}]`,
      ...manual ? [] : [`[Scheduled:: ${scheduled}]`],
      `[Total:: ${total}]`,
      ...manual ? [] : [`[Overtime:: ${Math.max(0, total - scheduled)}]`],
      `[Type:: ${manual ? "manual-break" : "short-break"}]`,
      `[Session:: ${s.id}]`,
      `[StartedBy:: start]`,
      `[EndedBy:: ${endedBy}]`,
      ...manual ? [] : [`[Planned:: ${scheduled}]`]
    ].join(" ");
    return this.log(s.id, s.startedAt, row);
  }
  interruptLog(start, end, note) {
    const sessionId = id(), total = Math.floor((end - start) / 1e3), row = [
      `- \u26A1 Interrupt [Note:: ${clean(note)}]`,
      `[Start:: ${dateTimeOf(start)}]`,
      `[End:: ${dateTimeOf(end)}]`,
      `[Total:: ${total}]`,
      `[Type:: interrupt]`,
      `[Session:: ${sessionId}]`,
      `[StartedBy:: manual]`,
      `[EndedBy:: manual]`,
      `[Offset:: ${-new Date(start).getTimezoneOffset()}]`
    ].join(" ");
    return this.log(sessionId, start, row);
  }
  manualInterrupt() {
    const note = window.prompt(this.t("interruptPrompt"), "");
    if (!note?.trim()) return;
    const end = Date.now(), start = end - 15 * 6e4;
    this.state.pendingLogs.push(this.interruptLog(start, end, note));
    this.persist();
    this.flush();
  }
  log(sessionId, stamp, row) {
    const marker = `[Session:: ${sessionId}]`;
    return {
      id: sessionId,
      path: `${this.state.settings.logFolder}/${dateOf(stamp)}.md`,
      marker,
      markdown: `${row}
`
    };
  }
  async startWork() {
    if (this.state.session && this.state.session.phase !== "breakDone") return;
    const task = this.state.task.trim();
    if (!task) return this.notice(this.t("taskRequired"));
    try {
      await this.unlockAudio();
    } catch (e) {
      this.notice(this.t("audioStart", { error: e.message }));
    }
    const now = Date.now();
    if (this.state.session?.phase === "breakDone") {
      this.stopAlarm();
      this.state.pendingLogs.push(this.breakLog(this.state.session, now, "time-up"));
    }
    const ms = Number(this.state.settings.focusMinutes) * 6e4;
    this.state.session = {
      id: id(),
      type: "work",
      phase: "focus",
      task,
      outcome: "",
      startedAt: now,
      plannedEndsAt: now + ms,
      focusDurationMs: ms
    };
    this.state.lastTask = task;
    await this.persist();
    this.render();
    this.flush();
  }
  startManualBreak() {
    if (this.state.session) return;
    this.state.session = {
      id: id(),
      type: "break",
      mode: "manual",
      phase: "manualBreak",
      startedAt: Date.now()
    };
    this.persist();
    this.render();
  }
  end() {
    const s = this.state.session;
    if (!s) return;
    if (s.type === "work") return this.showEnd();
    const now = Date.now();
    this.state.pendingLogs.push(this.breakLog(s, now));
    this.state.session = null;
    this.state.completedWork = null;
    this.stopAlarm();
    this.persist();
    this.render();
    this.flush();
  }
  showEnd() {
    this.panel.endDialog.hidden = false;
    this.panel.endDialog.style.display = "flex";
  }
  complete(outcome, note = "") {
    const s = this.state.session;
    if (!s || s.type !== "work") return;
    if (outcome === "interrupted" && !note.trim())
      return this.panel.endError.textContent = this.t("interruptRequired");
    const now = Date.now();
    this.state.pendingLogs.push(
      this.workLog(
        s,
        now,
        outcome,
        note,
        outcome === "interrupted" ? "interrupt" : "stop"
      )
    );
    this.state.session = null;
    this.stopAlarm();
    this.panel.endDialog.hidden = true;
    if (outcome === "completed") {
      this.state.completedWork = { task: s.task, endedAt: now };
      const ms = Number(this.state.settings.breakMinutes) * 6e4;
      this.state.session = {
        id: id(),
        type: "break",
        phase: "break",
        task: s.task,
        startedAt: now,
        endsAt: now + ms,
        breakDurationMs: ms
      };
    } else this.state.completedWork = null;
    this.persist();
    this.render();
    this.flush();
  }
  tick() {
    const s = this.state.session, now = Date.now();
    if (s?.type === "work" && s.phase === "focus" && now >= s.plannedEndsAt) {
      s.phase = "overtime";
      this.persist();
      this.startAlarm();
    }
    if (s?.type === "break" && s.phase === "break" && now >= s.endsAt) {
      s.phase = "breakDone";
      this.persist();
      this.startAlarm();
    }
    this.render();
  }
  field(parent, label, type, value) {
    const l = parent.createEl("label", { text: label });
    const i = l.createEl("input");
    i.type = type;
    i.value = String(value);
    return i;
  }
  open() {
    if (this.panel?.root?.isConnected) return;
    const root = document.body.createDiv({ cls: "rough-pomodoro-overlay" }), card = root.createDiv({ cls: "rough-pomodoro-card" });
    const header = card.createDiv({ cls: "rough-pomodoro-header" });
    header.createEl("b", { text: "POMODORO" });
    const close = header.createEl("button", { text: "\xD7" });
    close.onclick = () => root.remove();
    const task = this.field(card, this.t("task"), "text", this.state.task);
    task.oninput = () => {
      this.state.task = task.value;
      this.persist();
    };
    const hero = card.createDiv({ cls: "rough-pomodoro-hero" });
    const label = hero.createDiv(), state = hero.createDiv(), timer = hero.createDiv({ cls: "rough-pomodoro-clock" }), endLabel = hero.createDiv();
    const settings = card.createEl("details");
    settings.createEl("summary", { text: this.t("timerSettings") });
    const grid = settings.createDiv({ cls: "rough-pomodoro-grid" });
    const focus = this.field(
      grid,
      this.t("focusMinutes"),
      "number",
      this.state.settings.focusMinutes
    ), rest = this.field(
      grid,
      this.t("breakMinutes"),
      "number",
      this.state.settings.breakMinutes
    ), volume = this.field(grid, this.t("volume"), "range", this.state.settings.volume);
    const folder = this.field(
      settings,
      this.t("logFolder"),
      "text",
      this.state.settings.logFolder
    );
    [
      [focus, "focusMinutes"],
      [rest, "breakMinutes"],
      [volume, "volume"],
      [folder, "logFolder"]
    ].forEach(
      ([i, k]) => i.onchange = () => {
        this.state.settings[k] = k === "logFolder" ? i.value.trim().replace(/^\/|\/$/g, "") : Number(i.value);
        this.persist();
      }
    );
    const actions = card.createDiv({ cls: "rough-pomodoro-actions" });
    const button = (text, fn) => {
      const b = actions.createEl("button", { text });
      b.onclick = fn;
      return b;
    };
    const start = button(this.t("start"), () => this.startWork()), finish = button(this.t("finish"), () => this.end()), manual = button(this.t("manualBreak"), () => this.startManualBreak()), interrupt = button(this.t("interruptRecord"), () => this.manualInterrupt()), preview = button(this.t("preview"), async () => {
      try {
        await this.unlockAudio();
        this.sound();
      } catch (e) {
        this.notice(e.message);
      }
    });
    const error = card.createDiv({ cls: "rough-pomodoro-error" });
    const endDialog = root.createDiv({ cls: "rough-pomodoro-dialog" });
    endDialog.hidden = true;
    const endCard = endDialog.createDiv();
    endCard.createEl("b", { text: this.t("endTitle") });
    const done = endCard.createEl("button", { text: this.t("completed") }), interrupted = endCard.createEl("button", { text: this.t("interrupted") }), reason = endCard.createEl("textarea");
    reason.placeholder = this.t("interruptPlaceholder");
    const save = endCard.createEl("button", { text: this.t("recordAndEnd") }), cancel = endCard.createEl("button", { text: this.t("cancel") });
    done.onclick = () => this.complete("completed");
    interrupted.onclick = () => {
      reason.hidden = false;
      save.hidden = false;
    };
    reason.hidden = true;
    save.hidden = true;
    save.onclick = () => this.complete("interrupted", reason.value);
    cancel.onclick = () => endDialog.hidden = true;
    this.panel = {
      root,
      task,
      label,
      state,
      timer,
      end: endLabel,
      focus,
      rest,
      volume,
      folder,
      start,
      finish,
      manual,
      interrupt,
      preview,
      error,
      endDialog,
      endError: endCard.createDiv()
    };
    this.render();
  }
  render() {
    const p = this.panel, s = this.state.session, now = Date.now(), breakSession = s?.type === "break" ? s : null;
    if (!p || !p.root.isConnected) return;
    const work = s?.type === "work", br = Boolean(breakSession);
    p.task.value = work || s?.phase === "break" ? s.task : this.state.task;
    p.label.textContent = breakSession?.mode === "manual" ? this.t("pureBreak") : s ? this.t("currentTask", { task: s.task || this.t("breakResting") }) : this.state.completedWork ? this.t("completedTask", { task: this.state.completedWork.task }) : this.t("enterTask");
    if (work && s.phase === "focus") {
      p.state.textContent = this.t("focusing");
      p.timer.textContent = clock(s.plannedEndsAt - now);
      p.end.textContent = this.t("focusEnd", { time: timeOf(s.plannedEndsAt) });
    } else if (work) {
      p.state.textContent = this.t("overtime");
      p.timer.textContent = `+${clock(now - s.plannedEndsAt)}`;
      p.end.textContent = this.t("plannedEnd", { time: timeOf(s.plannedEndsAt) });
    } else if (breakSession?.mode === "manual") {
      p.state.textContent = this.t("resting");
      p.timer.textContent = clock(now - breakSession.startedAt);
      p.end.textContent = this.t("finishBreak");
    } else if (br && breakSession.phase === "break") {
      p.state.textContent = this.t("breakResting");
      p.timer.textContent = clock(breakSession.endsAt - now);
      p.end.textContent = this.t("breakEnd", { time: timeOf(breakSession.endsAt) });
    } else if (br) {
      p.state.textContent = this.t("breakOvertime");
      p.timer.textContent = `+${clock(now - breakSession.endsAt)}`;
      p.end.textContent = this.t("plannedEnd", { time: timeOf(breakSession.endsAt) });
    } else {
      p.state.textContent = this.t("waiting");
      p.timer.textContent = "--:--";
      p.end.textContent = this.t("ready");
    }
    p.start.disabled = !!s && s.phase !== "breakDone";
    p.finish.disabled = !s;
    p.manual.disabled = !!s;
    p.start.textContent = s?.phase === "breakDone" ? this.t("nextFocus") : s ? this.t("measuring") : this.t("start");
  }
};
var PomodoroSettings = class extends import_obsidian2.PluginSettingTab {
  constructor(app, pomodoro) {
    super(app, pomodoro);
    this.pomodoro = pomodoro;
  }
  display() {
    this.containerEl.empty();
    new import_obsidian2.Setting(this.containerEl).setName(this.pomodoro.t("open")).setDesc(this.pomodoro.t("settingsDescription"));
  }
};
