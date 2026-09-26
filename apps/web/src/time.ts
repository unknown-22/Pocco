export type DayPeriod = "morning" | "day" | "evening" | "night";

/** 指定タイムゾーンでの時・分。 */
export function localHM(epochMs: number, timeZone: string): { h: number; m: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(epochMs);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { h: get("hour"), m: get("minute") };
}

export function dayPeriod(hour: number): DayPeriod {
  if (hour >= 5 && hour < 9) return "morning";
  if (hour >= 9 && hour < 16) return "day";
  if (hour >= 16 && hour < 19) return "evening";
  return "night";
}

export function formatClock(epochMs: number, timeZone: string): string {
  const { h, m } = localHM(epochMs, timeZone);
  return `${h}:${String(m).padStart(2, "0")}`;
}
