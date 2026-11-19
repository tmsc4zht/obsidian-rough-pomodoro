const pad = (value: number): string => String(value).padStart(2, "0");

export const timeOf = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

export const clock = (milliseconds: number): string => {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
};

export interface TimerDisplay {
  state: string;
  timer: string;
  end: string;
}

export const timerDisplay = (
  state: string,
  duration: number,
  end: string,
  overtime = false,
): TimerDisplay => ({
  state,
  timer: `${overtime ? "+" : ""}${clock(duration)}`,
  end,
});
