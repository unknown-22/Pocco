// 孵化の演出: たまごがゆれる → ひびが入る → 光って割れる → 赤ちゃんが出てくる

import { EGG } from "../assets/index.ts";
import { drawPet } from "../pet.ts";
import { drawSprite, type Sprite } from "../sprite.ts";
import { GROUND, STAGE_SIZE, clamp01, drawBackdrop, drawSparkles, flash, speciesPalette } from "./common.ts";

/** 場面が終わって文字を出すまでの長さ */
export const HATCH_MS = 4200;

const CRACK_ROW = 6;
const top: Sprite = { ...EGG, rows: EGG.rows.slice(0, CRACK_ROW) };
const bottom: Sprite = { ...EGG, rows: EGG.rows.slice(CRACK_ROW) };
/** ひびの形（たまごの左からの位置と、ひびの行からのずれ） */
const CRACK = [0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1];

export function drawHatch(ctx: CanvasRenderingContext2D, t: number, speciesId: string) {
  const p = speciesPalette(speciesId, "baby");
  drawBackdrop(ctx, "#fdf1dc", "#f2d9b8");
  const ex = STAGE_SIZE / 2 - 6;
  const ey = GROUND - EGG.rows.length;

  if (t < 3000) {
    // だんだん大きく、速くゆれる
    const speed = t < 1800 ? 300 : 110;
    const wobble = t > 500 && Math.floor(t / speed) % 4 === 1 ? 1 : t > 500 && Math.floor(t / speed) % 4 === 3 ? -1 : 0;
    ctx.fillStyle = p.shadow;
    ctx.fillRect(ex + 1, GROUND - 1, 10, 2);
    drawSprite(ctx, EGG, ex + wobble, ey, p);
    // ひびが少しずつのびる
    const crack = Math.floor(clamp01((t - 1800) / 1000) * CRACK.length);
    ctx.fillStyle = p.shellLine;
    for (let i = 0; i < crack; i++) ctx.fillRect(ex + wobble + i, ey + CRACK_ROW + CRACK[i]!, 1, 1);
    flash(ctx, (t - 2700) / 300);
    return;
  }

  // 割れたあと: からが左右に分かれ、まんなかに赤ちゃん
  const k = clamp01((t - 3000) / 500);
  const bob = t > 3500 ? (Math.floor(t / 300) % 2 ? -1 : 0) : Math.round((1 - k) * 6);
  drawSprite(ctx, top, Math.round(ex - 20 * k), Math.round(ey - 6 * k + 18 * k * k), p);
  drawSprite(ctx, bottom, Math.round(ex + 20 * k), ey + CRACK_ROW, p);
  drawPet(ctx, { speciesId, stage: "baby", equipped: {}, pose: t > 3500 ? "happy" : "idle", t }, STAGE_SIZE / 2, GROUND + bob, p);
  if (t > 3300) drawSparkles(ctx, t, p);
  flash(ctx, 1 - (t - 3000) / 400);
}
