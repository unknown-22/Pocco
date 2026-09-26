// ライフステージ（仕様書 7.1）。寿命・最期の日の判定は P3 で追加する。

import type { Stage } from "./types.ts";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** 各段階が終わる年齢（ミリ秒）。 */
export const STAGE_ENDS: readonly { stage: Stage; until: number }[] = [
  { stage: "egg", until: 1 * HOUR },
  { stage: "baby", until: 1 * DAY },
  { stage: "child", until: 3 * DAY },
  { stage: "teen", until: 6 * DAY },
  { stage: "adult", until: 11 * DAY },
];

export const LIFESPAN_BASE = 14 * DAY;

/** 年齢からライフステージを求める（おとな以降はシニア止まり）。 */
export function stageForAge(ageMs: number): Stage {
  for (const { stage, until } of STAGE_ENDS) {
    if (ageMs < until) return stage;
  }
  return "senior";
}
