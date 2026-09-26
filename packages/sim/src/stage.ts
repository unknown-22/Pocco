// ライフステージ（仕様書 7.1）。一生は 14 日。世話で最大 ±12 時間ずれる（7.2）。

import type { Stage } from "./types.ts";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const LIFESPAN_BASE = 14 * DAY;
export const MAX_LIFESPAN_MODIFIER_HOURS = 12;
export const FINAL_DAY_MS = DAY;

/** 寿命（ミリ秒）。modifierHours は世話による前後 */
export function lifespanMs(modifierHours: number): number {
  const m = Math.max(-MAX_LIFESPAN_MODIFIER_HOURS, Math.min(MAX_LIFESPAN_MODIFIER_HOURS, modifierHours));
  return LIFESPAN_BASE + m * HOUR;
}

/** 年齢からライフステージを求める。シニア以降の境目は寿命に合わせてずれる。 */
export function stageForAge(ageMs: number, modifierHours = 0): Stage {
  const shift = lifespanMs(modifierHours) - LIFESPAN_BASE;
  if (ageMs < 1 * HOUR) return "egg";
  if (ageMs < 1 * DAY) return "baby";
  if (ageMs < 3 * DAY) return "child";
  if (ageMs < 6 * DAY) return "teen";
  if (ageMs < 11 * DAY + shift) return "adult";
  if (ageMs < 13 * DAY + shift) return "senior";
  if (ageMs < 14 * DAY + shift) return "final_day";
  return "departed";
}
