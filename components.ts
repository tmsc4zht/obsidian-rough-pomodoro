import "obsidian";
import type { PomodoroConfig } from "./pomodoro";
export { clock, timeOf, timerDisplay } from "./timer";

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
  start: HTMLButtonElement;
  finish: HTMLButtonElement;
  manual: HTMLButtonElement;
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
  onPreview: () => void;
  onComplete: (outcome: "completed" | "interrupted", note?: string) => void;
}

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
): Pick<PomodoroPanel, "focus" | "rest" | "volume" | "preview"> => {
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
  const settingInputs = [
    [focus, "focusMinutes"],
    [rest, "breakMinutes"],
    [volume, "volume"],
  ] as Array<[HTMLInputElement, keyof PomodoroConfig]>;
  for (const [input, key] of settingInputs) {
    input.onchange = () => {
      const value = options.onSettingChange(key, input.value);
      input.value = String(value ?? options.settings[key]);
    };
  }
  const preview = settings.createEl("button", { text: options.t("preview") });
  preview.onclick = options.onPreview;
  return { focus, rest, volume, preview };
};

const createActions = (
  card: HTMLElement,
  options: PomodoroPanelOptions,
): Pick<PomodoroPanel, "start" | "finish" | "manual"> => {
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
  };
};

const createEndDialog = (
  root: HTMLElement,
  options: PomodoroPanelOptions,
): Pick<PomodoroPanel, "endDialog" | "endError"> => {
  const endDialog = root.createDiv({ cls: "rough-pomodoro-dialog" });
  endDialog.hidden = true;
  const endCard = endDialog.createDiv();
  endCard.addClass("rough-pomodoro-dialog-card");
  const close = endCard.createEl("button", { text: "×" });
  close.addClass("rough-pomodoro-dialog-close");
  close.setAttribute("aria-label", options.t("close"));
  endCard.createEl("b", { text: options.t("endTitle") });
  const done = endCard.createEl("button", { text: options.t("completed") }),
    interrupted = endCard.createEl("button", { text: options.t("interrupted") }),
    reason = endCard.createEl("textarea");
  reason.placeholder = options.t("interruptPlaceholder");
  const save = endCard.createEl("button", { text: options.t("recordAndEnd") });
  close.onclick = () => (endDialog.hidden = true);
  done.onclick = () => options.onComplete("completed");
  interrupted.onclick = () => {
    reason.hidden = false;
    save.hidden = false;
  };
  reason.hidden = true;
  save.hidden = true;
  save.onclick = () => options.onComplete("interrupted", reason.value);
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
  return {
    root,
    task: createHeaderAndTask(card, root, options),
    ...createHero(card),
    ...createSettings(card, options),
    ...createActions(card, options),
    error: card.createDiv({ cls: "rough-pomodoro-error" }),
    ...createEndDialog(root, options),
  };
};
