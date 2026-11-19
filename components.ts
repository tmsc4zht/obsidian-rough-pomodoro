import "obsidian";
import type { PomodoroConfig } from "./pomodoro";

export interface PomodoroPanel {
  root: HTMLElement;
  task: HTMLInputElement;
  label: HTMLElement;
  state: HTMLElement;
  timer: HTMLElement;
  end: HTMLElement;
  focus: HTMLInputElement;
  rest: HTMLInputElement;
  volume: HTMLInputElement;
  folder: HTMLInputElement;
  start: HTMLButtonElement;
  finish: HTMLButtonElement;
  manual: HTMLButtonElement;
  interrupt: HTMLButtonElement;
  preview: HTMLButtonElement;
  error: HTMLElement;
  endDialog: HTMLElement;
  endError: HTMLElement;
}

export interface PomodoroPanelOptions {
  task: string;
  settings: PomodoroConfig;
  t: (key: string, values?: Record<string, string | number>) => string;
  onTaskInput: (task: string) => void;
  onSettingChange: (key: keyof PomodoroConfig, value: string) => string | number | null;
  onStart: () => void;
  onEnd: () => void;
  onManualBreak: () => void;
  onInterrupt: (note: string) => void;
  onPreview: () => void;
  onComplete: (outcome: "completed" | "interrupted", note?: string) => void;
}

const pad = (value: number): string => String(value).padStart(2, "0");

export const timeOf = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

export const clock = (ms: number): string => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
};

export const timerDisplay = (
  state: string,
  duration: number,
  end: string,
  overtime = false,
) => ({
  state,
  timer: `${overtime ? "+" : ""}${clock(duration)}`,
  end,
});

const createField = (
  parent: HTMLElement,
  label: string,
  type: string,
  value: string | number,
): HTMLInputElement => {
  const labelElement = parent.createEl("label", { text: label });
  const input = labelElement.createEl("input");
  input.type = type;
  input.value = String(value);
  return input;
};

const createHeaderAndTask = (
  card: HTMLElement,
  root: HTMLElement,
  options: PomodoroPanelOptions,
): HTMLInputElement => {
  const header = card.createDiv({ cls: "rough-pomodoro-header" });
  header.createEl("b", { text: "POMODORO" });
  const close = header.createEl("button", { text: "×" });
  close.onclick = () => root.remove();
  const task = createField(card, options.t("task"), "text", options.task);
  task.oninput = () => options.onTaskInput(task.value);
  return task;
};

const createHero = (
  card: HTMLElement,
): Pick<PomodoroPanel, "label" | "state" | "timer" | "end"> => {
  const hero = card.createDiv({ cls: "rough-pomodoro-hero" });
  return {
    label: hero.createDiv(),
    state: hero.createDiv(),
    timer: hero.createDiv({ cls: "rough-pomodoro-clock" }),
    end: hero.createDiv(),
  };
};

const createSettings = (
  card: HTMLElement,
  options: PomodoroPanelOptions,
): Pick<PomodoroPanel, "focus" | "rest" | "volume" | "folder"> => {
  const settings = card.createEl("details");
  settings.createEl("summary", { text: options.t("timerSettings") });
  const grid = settings.createDiv({ cls: "rough-pomodoro-grid" });
  const focus = createField(
      grid,
      options.t("focusMinutes"),
      "number",
      options.settings.focusMinutes,
    ),
    rest = createField(
      grid,
      options.t("breakMinutes"),
      "number",
      options.settings.breakMinutes,
    ),
    volume = createField(grid, options.t("volume"), "range", options.settings.volume);
  const folder = createField(
    settings,
    options.t("logFolder"),
    "text",
    options.settings.logFolder,
  );
  const settingInputs = [
    [focus, "focusMinutes"],
    [rest, "breakMinutes"],
    [volume, "volume"],
    [folder, "logFolder"],
  ] as Array<[HTMLInputElement, keyof PomodoroConfig]>;
  for (const [input, key] of settingInputs) {
    input.onchange = () => {
      const value = options.onSettingChange(key, input.value);
      input.value = String(value ?? options.settings[key]);
    };
  }
  return { focus, rest, volume, folder };
};

const createActions = (
  card: HTMLElement,
  options: PomodoroPanelOptions,
  openInterruptDialog: () => void,
): Pick<PomodoroPanel, "start" | "finish" | "manual" | "interrupt" | "preview"> => {
  const actions = card.createDiv({ cls: "rough-pomodoro-actions" });
  const button = (text: string, onClick: () => void): HTMLButtonElement => {
    const element = actions.createEl("button", { text });
    element.onclick = onClick;
    return element;
  };
  return {
    start: button(options.t("start"), options.onStart),
    finish: button(options.t("finish"), options.onEnd),
    manual: button(options.t("manualBreak"), options.onManualBreak),
    interrupt: button(options.t("interruptRecord"), openInterruptDialog),
    preview: button(options.t("preview"), options.onPreview),
  };
};

const createInterruptDialog = (
  root: HTMLElement,
  options: PomodoroPanelOptions,
): (() => void) => {
  const dialog = root.createDiv({ cls: "rough-pomodoro-dialog" });
  dialog.hidden = true;
  const card = dialog.createDiv();
  card.createEl("b", { text: options.t("interruptPrompt") });
  const reason = card.createEl("textarea");
  reason.placeholder = options.t("interruptPlaceholder");
  const error = card.createDiv({ cls: "rough-pomodoro-error" });
  const save = card.createEl("button", { text: options.t("saveInterrupt") });
  const cancel = card.createEl("button", { text: options.t("cancel") });
  save.onclick = () => {
    if (!reason.value.trim()) {
      error.textContent = options.t("interruptRequired");
      reason.focus();
      return;
    }
    options.onInterrupt(reason.value);
    dialog.hidden = true;
    reason.value = "";
    error.textContent = "";
  };
  cancel.onclick = () => {
    dialog.hidden = true;
    reason.value = "";
    error.textContent = "";
  };
  return () => {
    reason.value = "";
    error.textContent = "";
    dialog.hidden = false;
    reason.focus();
  };
};

const createEndDialog = (
  root: HTMLElement,
  options: PomodoroPanelOptions,
): Pick<PomodoroPanel, "endDialog" | "endError"> => {
  const endDialog = root.createDiv({ cls: "rough-pomodoro-dialog" });
  endDialog.hidden = true;
  const endCard = endDialog.createDiv();
  endCard.createEl("b", { text: options.t("endTitle") });
  const done = endCard.createEl("button", { text: options.t("completed") }),
    interrupted = endCard.createEl("button", { text: options.t("interrupted") }),
    reason = endCard.createEl("textarea");
  reason.placeholder = options.t("interruptPlaceholder");
  const save = endCard.createEl("button", { text: options.t("recordAndEnd") }),
    cancel = endCard.createEl("button", { text: options.t("cancel") });
  done.onclick = () => options.onComplete("completed");
  interrupted.onclick = () => {
    reason.hidden = false;
    save.hidden = false;
  };
  reason.hidden = true;
  save.hidden = true;
  save.onclick = () => options.onComplete("interrupted", reason.value);
  cancel.onclick = () => (endDialog.hidden = true);
  return {
    endDialog,
    endError: endCard.createDiv(),
  };
};

export const createPomodoroPanel = (
  document: Document,
  options: PomodoroPanelOptions,
): PomodoroPanel => {
  const root = document.body.createDiv({ cls: "rough-pomodoro-overlay" });
  const card = root.createDiv({ cls: "rough-pomodoro-card" });
  const openInterruptDialog = createInterruptDialog(root, options);
  return {
    root,
    task: createHeaderAndTask(card, root, options),
    ...createHero(card),
    ...createSettings(card, options),
    ...createActions(card, options, openInterruptDialog),
    error: card.createDiv({ cls: "rough-pomodoro-error" }),
    ...createEndDialog(root, options),
  };
};
