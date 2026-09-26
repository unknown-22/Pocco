// 全画面の演出（仕様書 11.2）で共通に使うもの。場面は 64×64 の小さな舞台に描いて拡大する。

import { getSpecies } from "@pocco/sim";
import { paletteFor, withSpecies } from "../palette.ts";
import { SPARKLE } from "../assets/index.ts";
import { drawSprite, type DrawPalette } from "../sprite.ts";

export const STAGE_SIZE = 64;
/** 足もとの高さ */
export const GROUND = 50;

/** 種族の色を入れた昼のパレット */
export function speciesPalette(speciesId: string, stage: string) {
  const senior = stage === "senior" || stage === "final_day";
  return withSpecies(paletteFor("day"), "day", getSpecies(speciesId).colors, senior);
}

/** 背景（やわらかい色のベタ塗りと、床の帯） */
export function drawBackdrop(ctx: CanvasRenderingContext2D, sky: string, floor: string) {
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, STAGE_SIZE, STAGE_SIZE);
  ctx.fillStyle = floor;
  ctx.fillRect(0, GROUND, STAGE_SIZE, STAGE_SIZE - GROUND);
}

/** まわりできらきら光る（t で点滅の位置が変わる） */
export function drawSparkles(ctx: CanvasRenderingContext2D, t: number, p: DrawPalette, count = 5) {
  const spots = [
    [10, 14], [50, 10], [6, 34], [54, 32], [30, 6], [18, 42], [44, 44],
  ] as const;
  spots.slice(0, count).forEach(([x, y], i) => {
    if (Math.floor(t / 180 + i * 1.7) % 3 !== 0) drawSprite(ctx, SPARKLE, x - 2, y - 2, p);
  });
}

/** 画面いっぱいの白い光（a は 0〜1） */
export function flash(ctx: CanvasRenderingContext2D, a: number) {
  if (a <= 0) return;
  ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, a)})`;
  ctx.fillRect(0, 0, STAGE_SIZE, STAGE_SIZE);
}

/** 0〜1 に収める */
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
