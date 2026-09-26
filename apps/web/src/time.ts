import { localParts } from "@pocco/sim";

export type DayPeriod = "morning" | "day" | "evening" | "night";

export function dayPeriod(hour: number): DayPeriod {
  if (hour >= 5 && hour < 9) return "morning";
  if (hour >= 9 && hour < 16) return "day";
  if (hour >= 16 && hour < 19) return "evening";
  return "night";
}

export function formatClock(epochMs: number, timeZone: string): string {
  const { hour, minute } = localParts(epochMs, timeZone);
  return `${hour}:${String(minute).padStart(2, "0")}`;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** 「今日」「昨日」「1月5日(月)」 */
export function dayLabel(epochMs: number, now: number, timeZone: string): string {
  const p = localParts(epochMs, timeZone);
  const n = localParts(now, timeZone);
  const a = Date.UTC(p.year, p.month - 1, p.day);
  const b = Date.UTC(n.year, n.month - 1, n.day);
  const diff = Math.round((b - a) / 86_400_000);
  if (diff === 0) return "今日";
  if (diff === 1) return "昨日";
  return `${p.month}月${p.day}日(${WEEKDAYS[new Date(a).getUTCDay()]})`;
}

/** 「5時間」「2日」など、留守の長さ */
export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min}分`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}時間`;
  return `${Math.round(h / 24)}日`;
}
