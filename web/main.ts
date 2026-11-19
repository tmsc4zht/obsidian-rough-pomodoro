import {
  advanceSession,
  completeWorkSession,
  endBreakSession,
  normalizePomodoroState,
  startManualBreakSession,
  startWorkSession,
  type PomodoroLog,
  type WorkSession,
} from "../pomodoro";
import enMessages from "../locales/en-US.json";
import jaMessages from "../locales/ja-JP.json";
import enWebMessages from "./locales/en-US.json";
import jaWebMessages from "./locales/ja-JP.json";
import { timeOf, timerDisplay } from "../timer";

type Locale = "ja-JP" | "en-US";
type Messages = Record<string, string>;
type AlarmMode = "sound" | "vibration";

const STORAGE_KEY = "rough-pomodoro:web:v1";
const catalogs: Record<Locale, Messages> = {
  "ja-JP": { ...jaMessages, ...jaWebMessages },
  "en-US": { ...enMessages, ...enWebMessages },
};

const element = <T extends HTMLElement>(selector: string): T => {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing page element: ${selector}`);
  return found;
};

const errorText = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error === null) return "null";
  if (typeof error !== "object") return typeof error;
  try {
    return JSON.stringify(error) ?? "Unknown error";
  } catch {
    return "Unknown error";
  }
};

const detectLocale = (): Locale =>
  navigator.language.toLowerCase().startsWith("ja") ? "ja-JP" : "en-US";

let locale = detectLocale();
let state = normalizePomodoroState(null);
let alarmMode: AlarmMode = "sound";
let notificationsEnabled = false;
let storageReadFailed = false;
let storageError = "";
let errorMessage = "";
let audio: AudioContext | null = null;
let alarm: number | null = null;

const taskInput = element<HTMLInputElement>("#task");
const languageSelect = element<HTMLSelectElement>("#language");
const focusInput = element<HTMLInputElement>("#focus-minutes");
const breakInput = element<HTMLInputElement>("#break-minutes");
const volumeInput = element<HTMLInputElement>("#volume");
const volumeSetting = element<HTMLLabelElement>("#volume-setting");
const alarmModeSelect = element<HTMLSelectElement>("#alarm-mode");
const notificationsInput = element<HTMLInputElement>("#notifications-enabled");
const notificationsNote = element<HTMLElement>("#notifications-note");
const label = element<HTMLElement>("#label");
const stateLabel = element<HTMLElement>("#state");
const timer = element<HTMLElement>("#timer");
const endLabel = element<HTMLElement>("#end");
const startButton = element<HTMLButtonElement>("#start");
const finishButton = element<HTMLButtonElement>("#finish");
const manualBreakButton = element<HTMLButtonElement>("#manual-break");
const previewButton = element<HTMLButtonElement>("#preview");
const errorElement = element<HTMLElement>("#error");
const storageErrorElement = element<HTMLElement>("#storage-error");
const resetStorageButton = element<HTMLButtonElement>("#reset-storage");
const clearLogsButton = element<HTMLButtonElement>("#clear-logs");
const historyList = element<HTMLUListElement>("#history-list");
const historyEmpty = element<HTMLElement>("#history-empty");
const endDialog = element<HTMLDialogElement>("#end-dialog");
const resetDialog = element<HTMLDialogElement>("#reset-dialog");
const clearLogsDialog = element<HTMLDialogElement>("#clear-logs-dialog");
const endNote = element<HTMLTextAreaElement>("#end-note");
const endError = element<HTMLElement>("#end-error");
const saveEndButton = element<HTMLButtonElement>("#save-end");

const t = (key: string, values: Record<string, string | number> = {}): string => {
  let message = catalogs[locale][key] || key;
  for (const [name, value] of Object.entries(values)) {
    message = message.replace(`{${name}}`, String(value));
  }
  return message;
};

const renderErrors = (): void => {
  errorElement.textContent = errorMessage;
  errorElement.hidden = !errorMessage;
  storageErrorElement.textContent = storageError;
  storageErrorElement.hidden = !storageError;
  resetStorageButton.hidden = !storageReadFailed;
};

const setError = (message: string): void => {
  errorMessage = message;
  renderErrors();
};

const clearError = (): void => {
  errorMessage = "";
  renderErrors();
};

const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("./sw.js");
  } catch (error) {
    setError(t("serviceWorkerError", { error: errorText(error) }));
    return null;
  }
};

const serviceWorkerRegistration = registerServiceWorker();

try {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw !== null) {
    const saved: unknown = JSON.parse(raw);
    state = normalizePomodoroState(saved);
    if (typeof saved === "object" && saved !== null) {
      if ("alarmMode" in saved && saved.alarmMode === "vibration") {
        alarmMode = "vibration";
      }
      if (
        "notificationsEnabled" in saved &&
        typeof saved.notificationsEnabled === "boolean"
      ) {
        notificationsEnabled = saved.notificationsEnabled;
      }
    }
  }
} catch (error) {
  storageReadFailed = true;
  storageError = t("loadState", { error: errorText(error) });
}

const validDuration = (value: number, fallback: number): number =>
  Number.isFinite(value) ? Math.min(180, Math.max(1, Math.floor(value))) : fallback;

state.settings.focusMinutes = validDuration(state.settings.focusMinutes, 25);
state.settings.breakMinutes = validDuration(state.settings.breakMinutes, 5);
state.settings.volume = Number.isFinite(state.settings.volume)
  ? Math.min(1, Math.max(0, state.settings.volume))
  : 0.6;

const persist = (): void => {
  if (storageReadFailed) {
    renderErrors();
    return;
  }
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, alarmMode, notificationsEnabled }),
    );
    storageError = "";
    renderErrors();
  } catch (error) {
    storageError = t("saveStateWeb", { error: errorText(error) });
    renderErrors();
  }
};

const applyLocale = (): void => {
  document.documentElement.lang = locale;
  document.title = t("webTitle");
  languageSelect.value = locale;
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    if (key) node.textContent = t(key);
  });
  document
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-i18n-placeholder]")
    .forEach((input) => {
      const key = input.dataset.i18nPlaceholder;
      if (key) input.placeholder = t(key);
    });
  document.querySelectorAll<HTMLElement>("[data-i18n-aria-label]").forEach((node) => {
    const key = node.dataset.i18nAriaLabel;
    if (key) node.setAttribute("aria-label", t(key));
  });
};

const updateAlarmSettings = (): void => {
  alarmModeSelect.value = alarmMode;
  volumeSetting.hidden = alarmMode !== "sound";
};

const updateNotificationSettings = (): void => {
  const permission =
    typeof window.Notification === "undefined"
      ? "unsupported"
      : window.Notification.permission;
  const supported = permission !== "unsupported" && "serviceWorker" in navigator;
  notificationsInput.disabled = !supported;
  notificationsInput.checked =
    supported && notificationsEnabled && permission === "granted";
  notificationsNote.textContent = !supported
    ? t("notificationsUnavailable")
    : permission === "denied"
      ? t("notificationsDenied")
      : t("notificationsNotice");
};

const saveSettings = (
  key: "focusMinutes" | "breakMinutes" | "volume",
  input: HTMLInputElement,
): void => {
  const value = Number(input.value);
  const valid =
    Number.isFinite(value) &&
    (key === "volume" ? value >= 0 && value <= 1 : value >= 1 && value <= 180);
  if (!valid) {
    input.value = String(state.settings[key]);
    setError(t("invalidSetting"));
    return;
  }
  state.settings[key] = value;
  clearError();
  persist();
};

const unlockAudio = async (): Promise<void> => {
  if (!window.AudioContext) throw new Error(t("audioUnavailable"));
  audio ||= new AudioContext();
  await audio.resume();
  if (audio.state !== "running") throw new Error(t("audioNotRunning"));
};

const playSound = (): void => {
  const context = audio;
  if (!context || context.state !== "running") throw new Error(t("audioLocked"));
  const start = context.currentTime + 0.02;
  [880, 1046.5, 880, 1046.5].forEach((frequency, index) => {
    const at = start + index * 0.22;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(state.settings.volume * 0.6, at + 0.012);
    gain.gain.linearRampToValueAtTime(0, at + 0.13);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.14);
  });
};

const playVibration = (): void => {
  if (typeof navigator.vibrate !== "function" || !navigator.vibrate([240, 100, 240])) {
    throw new Error(t("vibrationUnavailable"));
  }
};

const playAlarm = (): void => {
  if (alarmMode === "vibration") {
    playVibration();
    return;
  }
  playSound();
};

const stopAlarm = (): void => {
  if (alarm !== null) {
    window.clearInterval(alarm);
    alarm = null;
  }
};

const startAlarm = (): void => {
  stopAlarm();
  try {
    playAlarm();
  } catch (error) {
    setError(
      alarmMode === "sound"
        ? `${errorText(error)}${t("alarmContinues")}`
        : errorText(error),
    );
    return;
  }
  alarm = window.setInterval(() => {
    try {
      playAlarm();
    } catch (error) {
      stopAlarm();
      setError(
        alarmMode === "sound"
          ? `${errorText(error)}${t("alarmContinues")}`
          : errorText(error),
      );
    }
  }, 1200);
};

const copyLogs = async (textarea: HTMLTextAreaElement): Promise<void> => {
  if (!navigator.clipboard?.writeText) {
    textarea.focus();
    textarea.select();
    setError(t("clipboardUnavailable"));
    return;
  }
  try {
    await navigator.clipboard.writeText(textarea.value);
    setError(t("logCopied"));
  } catch (error) {
    textarea.focus();
    textarea.select();
    setError(t("copyFailed", { error: errorText(error) }));
  }
};

const notifySessionEnd = async (sessionType: "work" | "break"): Promise<void> => {
  if (
    !notificationsEnabled ||
    typeof window.Notification === "undefined" ||
    window.Notification.permission !== "granted"
  ) {
    return;
  }
  try {
    const registration = await serviceWorkerRegistration;
    if (!registration) throw new Error(t("notificationsUnavailable"));
    const body = t(sessionType === "work" ? "focusNotification" : "breakNotification");
    const icon = new URL("./icon-192.png", window.location.href).href;
    await registration.showNotification(t("webTitle"), {
      body,
      icon,
      badge: icon,
      tag: `rough-pomodoro-${sessionType}-${Date.now()}`,
    });
  } catch (error) {
    setError(t("notificationFailed", { error: errorText(error) }));
  }
};

const renderHistory = (): void => {
  const groups = new Map<string, PomodoroLog[]>();
  state.pendingLogs.forEach((log) => {
    const group = groups.get(log.path) || [];
    group.push(log);
    groups.set(log.path, group);
  });

  historyList.replaceChildren();
  const entries = [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
  historyEmpty.hidden = entries.length > 0;
  clearLogsButton.disabled = state.pendingLogs.length === 0;
  entries.forEach(([path, logs]) => {
    const row = document.createElement("li");
    const details = document.createElement("details");
    details.className = "history-entry";
    const summary = document.createElement("summary");
    const date = path.split("/").pop() || path;
    summary.textContent = t("logDateCount", { date, count: logs.length });
    const textarea = document.createElement("textarea");
    textarea.className = "log-markdown";
    textarea.readOnly = true;
    textarea.spellcheck = false;
    textarea.setAttribute("aria-label", t("logTextLabel", { date }));
    textarea.value = `${logs.map((log) => log.markdown.trimEnd()).join("\n\n")}\n`;
    const button = document.createElement("button");
    button.className = "button";
    button.type = "button";
    button.textContent = t("copyLog");
    button.addEventListener("click", () => void copyLogs(textarea));
    details.append(summary, textarea, button);
    row.append(details);
    historyList.append(row);
  });
};

const render = (): void => {
  const session = state.session;
  const now = Date.now();
  let display = {
    state: t("waiting"),
    timer: "--:--",
    end: t("ready"),
  };

  if (session?.type === "work") {
    label.textContent = t("currentTask", {
      task: session.task || t("breakResting"),
    });
    display =
      session.phase === "focus"
        ? timerDisplay(
            t("focusing"),
            session.plannedEndsAt - now,
            t("focusEnd", { time: timeOf(session.plannedEndsAt) }),
          )
        : timerDisplay(
            t("overtime"),
            now - session.plannedEndsAt,
            t("plannedEnd", { time: timeOf(session.plannedEndsAt) }),
            true,
          );
  } else if (session?.type === "break") {
    label.textContent =
      session.mode === "manual"
        ? t("pureBreak")
        : t("currentTask", { task: session.task || t("breakResting") });
    if (session.mode === "manual") {
      display = timerDisplay(t("resting"), now - session.startedAt, t("finishBreak"));
    } else if (session.phase === "break") {
      const deadline = session.endsAt ?? now;
      display = timerDisplay(
        t("breakResting"),
        deadline - now,
        t("breakEnd", { time: timeOf(deadline) }),
      );
    } else {
      const deadline = session.endsAt ?? now;
      display = timerDisplay(
        t("breakOvertime"),
        now - deadline,
        t("plannedEnd", { time: timeOf(deadline) }),
        true,
      );
    }
  } else {
    label.textContent = state.completedWork
      ? t("completedTask", { task: state.completedWork.task })
      : t("enterTask");
  }

  if (document.activeElement !== taskInput) {
    taskInput.value =
      session?.type === "work" || session?.phase === "break"
        ? (session.task ?? state.task)
        : state.task;
  }
  taskInput.disabled = session !== null && session.phase !== "breakDone";
  stateLabel.textContent = display.state;
  timer.textContent = display.timer;
  endLabel.textContent = display.end;
  startButton.disabled = session !== null && session.phase !== "breakDone";
  finishButton.disabled = session === null;
  manualBreakButton.disabled = session !== null;
  startButton.textContent =
    session?.phase === "breakDone"
      ? t("nextFocus")
      : session
        ? t("measuring")
        : t("start");
};

const startWork = (): void => {
  if (state.session && state.session.phase !== "breakDone") return;
  const task = state.task.trim();
  if (!task) {
    setError(t("taskRequired"));
    taskInput.focus();
    return;
  }

  clearError();
  if (alarmMode === "sound") {
    void unlockAudio().catch((error: unknown) => {
      setError(t("audioStart", { error: errorText(error) }));
    });
  }

  const completedBreakLog = startWorkSession(
    state,
    task,
    Date.now(),
    crypto.randomUUID(),
  );
  if (completedBreakLog) {
    stopAlarm();
    state.pendingLogs.push(completedBreakLog);
  }
  persist();
  renderHistory();
  render();
};

const completeWork = (outcome: WorkSession["outcome"], note = ""): void => {
  if (outcome === "interrupted" && !note.trim()) {
    endError.textContent = t("interruptRequired");
    endNote.focus();
    return;
  }
  if (
    !completeWorkSession(state, outcome, note, Date.now(), () => crypto.randomUUID())
  ) {
    return;
  }
  stopAlarm();
  endDialog.close();
  endNote.value = "";
  endNote.hidden = true;
  saveEndButton.hidden = true;
  endError.textContent = "";
  clearError();
  persist();
  renderHistory();
  render();
};

const tick = (): void => {
  const completed = advanceSession(state, Date.now());
  if (completed) {
    persist();
    startAlarm();
    void notifySessionEnd(completed);
  }
  render();
};

languageSelect.value = locale;
applyLocale();
updateAlarmSettings();
updateNotificationSettings();
renderHistory();
renderErrors();

languageSelect.addEventListener("change", () => {
  locale = languageSelect.value === "ja-JP" ? "ja-JP" : "en-US";
  applyLocale();
  updateNotificationSettings();
  renderHistory();
  render();
});

taskInput.addEventListener("input", () => {
  state.task = taskInput.value;
  persist();
});
focusInput.value = String(state.settings.focusMinutes);
breakInput.value = String(state.settings.breakMinutes);
volumeInput.value = String(state.settings.volume);
focusInput.addEventListener("change", () => saveSettings("focusMinutes", focusInput));
breakInput.addEventListener("change", () => saveSettings("breakMinutes", breakInput));
volumeInput.addEventListener("change", () => saveSettings("volume", volumeInput));
alarmModeSelect.addEventListener("change", () => {
  alarmMode = alarmModeSelect.value === "vibration" ? "vibration" : "sound";
  updateAlarmSettings();
  clearError();
  persist();
});
notificationsInput.addEventListener("change", () => {
  void (async () => {
    if (!notificationsInput.checked) {
      notificationsEnabled = false;
      clearError();
      persist();
      updateNotificationSettings();
      return;
    }

    if (typeof window.Notification === "undefined" || !("serviceWorker" in navigator)) {
      notificationsEnabled = false;
      setError(t("notificationsUnavailable"));
      updateNotificationSettings();
      return;
    }
    if (window.Notification.permission === "denied") {
      notificationsEnabled = false;
      setError(t("notificationsDenied"));
      updateNotificationSettings();
      return;
    }

    try {
      const permission = await window.Notification.requestPermission();
      notificationsEnabled = permission === "granted";
      if (notificationsEnabled) {
        clearError();
      } else {
        setError(t("notificationsDenied"));
      }
      persist();
      updateNotificationSettings();
    } catch (error) {
      notificationsEnabled = false;
      setError(t("notificationPermissionError", { error: errorText(error) }));
      updateNotificationSettings();
    }
  })();
});
window.addEventListener("focus", updateNotificationSettings);
startButton.addEventListener("click", startWork);
manualBreakButton.addEventListener("click", () => {
  if (state.session) return;
  startManualBreakSession(state, crypto.randomUUID(), Date.now());
  persist();
  render();
});
finishButton.addEventListener("click", () => {
  const session = state.session;
  if (!session) return;
  if (session.type === "work") {
    endError.textContent = "";
    endNote.value = "";
    endNote.hidden = true;
    saveEndButton.hidden = true;
    endDialog.showModal();
    return;
  }
  endBreakSession(state, Date.now());
  stopAlarm();
  persist();
  renderHistory();
  render();
});

element<HTMLButtonElement>("#complete-work").addEventListener("click", () => {
  completeWork("completed");
});
element<HTMLButtonElement>("#interrupt-work").addEventListener("click", () => {
  endNote.hidden = false;
  saveEndButton.hidden = false;
  endNote.focus();
});
saveEndButton.addEventListener("click", () => {
  completeWork("interrupted", endNote.value);
});
element<HTMLButtonElement>("#cancel-end").addEventListener("click", () => {
  endDialog.close();
});
previewButton.addEventListener("click", () => {
  void (async () => {
    try {
      if (alarmMode === "vibration") {
        playVibration();
      } else {
        await unlockAudio();
        playSound();
      }
      clearError();
    } catch (error) {
      setError(errorText(error));
    }
  })();
});
resetStorageButton.addEventListener("click", () => {
  resetDialog.showModal();
});
element<HTMLButtonElement>("#confirm-reset").addEventListener("click", () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    state = normalizePomodoroState(null);
    alarmMode = "sound";
    notificationsEnabled = false;
    storageReadFailed = false;
    storageError = "";
    resetDialog.close();
    persist();
    updateAlarmSettings();
    updateNotificationSettings();
    focusInput.value = String(state.settings.focusMinutes);
    breakInput.value = String(state.settings.breakMinutes);
    volumeInput.value = String(state.settings.volume);
    renderHistory();
    render();
  } catch (error) {
    storageError = t("saveStateWeb", { error: errorText(error) });
    renderErrors();
  }
});
element<HTMLButtonElement>("#cancel-reset").addEventListener("click", () => {
  resetDialog.close();
});
clearLogsButton.addEventListener("click", () => {
  if (state.pendingLogs.length > 0) clearLogsDialog.showModal();
});
element<HTMLButtonElement>("#confirm-clear-logs").addEventListener("click", () => {
  state.pendingLogs = [];
  clearLogsDialog.close();
  clearError();
  persist();
  renderHistory();
});
element<HTMLButtonElement>("#cancel-clear-logs").addEventListener("click", () => {
  clearLogsDialog.close();
});

window.setInterval(tick, 1000);
tick();
window.addEventListener("pagehide", stopAlarm);
