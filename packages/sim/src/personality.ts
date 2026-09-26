import type { Personality, PetState } from "./types.ts";

/** 1 日に 1 つの軸が動ける量（仕様書 6.3: 急に別人にならないように） */
export const DAILY_DRIFT_LIMIT = 5;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** 性格を少しずらす。その日の上限を超える分は捨てる。 */
export function drift(state: PetState, axis: keyof Personality, delta: number, day: string) {
  if (state.drift.day !== day) state.drift = { day, used: {} };
  const used = state.drift.used[axis] ?? 0;
  const allowed = clamp(delta, -(DAILY_DRIFT_LIMIT - used), DAILY_DRIFT_LIMIT - used);
  if (allowed === 0) return;
  state.drift.used[axis] = used + Math.abs(allowed);
  state.personality[axis] = clamp(state.personality[axis] + allowed, -100, 100);
}

/** 就寝・起床時刻。夜型ほど遅く、朝型ほど早い（±2 時間）。 */
export function sleepSchedule(p: Personality) {
  const shift = (p.chronotype / 100) * 2;
  return { bedtime: 23 + shift, wake: 7 + shift };
}

export function inSleepWindow(hour: number, p: Personality): boolean {
  const { bedtime, wake } = sleepSchedule(p);
  const len = (wake - bedtime + 24) % 24;
  return (hour - bedtime + 24) % 24 < len;
}
