// ミニゲームのルール（仕様書 10.2）。描画から切り離して、テストできるようにする。

import { createRng, hashSeed } from "@pocco/sim";

// ---------------------------------------------------------------- キャッチ

export const CATCH = {
  durationMs: 8000,
  successAt: 5,
  playerY: 108,
  catchRange: 10,
  fieldMin: 10,
  fieldMax: 118,
};

export interface FallingItem {
  id: number;
  at: number; // 出てくる時刻（ms）
  x: number;
  kind: "snack" | "paper";
}

/** 落ちてくる物の予定表。やんちゃな子（speed が大きい）ほど多く速い */
export function catchSpawns(seed: number, speed: number): FallingItem[] {
  const rng = createRng(hashSeed(seed, "catch"));
  const items: FallingItem[] = [];
  const interval = 650 / speed;
  for (let t = 400, id = 0; t < CATCH.durationMs - 1200; t += interval * (0.7 + rng() * 0.6), id++) {
    items.push({ id, at: t, x: CATCH.fieldMin + rng() * (CATCH.fieldMax - CATCH.fieldMin), kind: rng() < 0.2 ? "paper" : "snack" });
  }
  return items;
}

/** 落ちる速さ（px/s） */
export const fallSpeed = (speed: number) => 55 * speed;

/** 時刻 t での物の y 座標 */
export function itemY(item: FallingItem, t: number, speed: number): number {
  return -8 + ((t - item.at) / 1000) * fallSpeed(speed);
}

/** 受け止めたか */
export function caught(itemX: number, y: number, playerX: number): boolean {
  return y >= CATCH.playerY - 8 && y <= CATCH.playerY + 2 && Math.abs(itemX - playerX) <= CATCH.catchRange;
}

// ---------------------------------------------------------------- かくれんぼ

export const HIDE = { rounds: 3, successAt: 2, answerMs: 4000 };

export const HIDE_SPOTS = [
  { id: "fridge", label: "れいぞうこ", x: 15, y: 60 },
  { id: "rug", label: "クッション", x: 60, y: 104 },
  { id: "bed", label: "ベッド", x: 108, y: 80 },
] as const;

export interface HideRound {
  spot: number;
  /** 寝てしまって Zz が見える */
  asleep: boolean;
  /** 目だけのぞいている */
  peek: boolean;
}

export function hideRounds(seed: number, aptitude: { sleepy: number; peek: number }): HideRound[] {
  const rng = createRng(hashSeed(seed, "hide"));
  return Array.from({ length: HIDE.rounds }, () => ({
    spot: Math.floor(rng() * HIDE_SPOTS.length),
    asleep: rng() < aptitude.sleepy,
    peek: rng() < aptitude.peek,
  }));
}

// ---------------------------------------------------------------- リズムタップ

export const RHYTHM = { beats: 6, successAt: 4, goodMs: 110, okMs: 220, leadMs: 1200 };

/** 拍の時刻（ms）。きちょうめんな子は一定のテンポ、そうでない子は少しゆらぐ */
export function rhythmBeats(seed: number, steady: boolean, speed: number): number[] {
  const rng = createRng(hashSeed(seed, "rhythm"));
  const base = 620 / speed;
  const beats: number[] = [];
  let t = RHYTHM.leadMs;
  for (let i = 0; i < RHYTHM.beats; i++) {
    beats.push(Math.round(t));
    t += steady ? base : base * (0.8 + rng() * 0.4);
  }
  return beats;
}

export type Grade = "good" | "ok" | "miss";

/** タップを一番近い未判定の拍に当てはめる */
export function judgeTap(beats: number[], judged: (Grade | null)[], tapMs: number): { index: number; grade: Grade } | null {
  let best = -1;
  let bestDiff = Infinity;
  beats.forEach((b, i) => {
    if (judged[i]) return;
    const d = Math.abs(tapMs - b);
    if (d < bestDiff) {
      best = i;
      bestDiff = d;
    }
  });
  if (best < 0 || bestDiff > RHYTHM.okMs * 2) return null;
  return { index: best, grade: bestDiff <= RHYTHM.goodMs ? "good" : bestDiff <= RHYTHM.okMs ? "ok" : "miss" };
}

export const rhythmScore = (judged: (Grade | null)[]) => judged.filter((g) => g === "good" || g === "ok").length;
