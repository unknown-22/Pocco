// 進化の演出: いまの姿と次の姿が、だんだん速く入れかわる → 光る → 新しい姿で喜ぶ

import { drawPet } from "../pet.ts";
import { GROUND, STAGE_SIZE, drawBackdrop, drawSparkles, flash, speciesPalette } from "./common.ts";

export const EVOLVE_MS = 4000;

export interface EvolveLook {
  fromSpecies: string;
  fromStage: string;
  toSpecies: string;
  toStage: string;
}

/** 白いシルエットにする（直前に描いた姿だけを塗る） */
function silhouette(ctx: CanvasRenderingContext2D) {
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, STAGE_SIZE, STAGE_SIZE);
  ctx.globalCompositeOperation = "source-over";
}

export function drawEvolve(ctx: CanvasRenderingContext2D, t: number, look: EvolveLook) {
  const cx = STAGE_SIZE / 2;
  // 背景は別の層（透明のところにシルエットがはみ出さないよう、姿は一度別のキャンバスに描く）
  drawBackdrop(ctx, "#4a5596", "#39437d");
  const layer = offscreen();
  const lc = layer.getContext("2d")!;
  lc.clearRect(0, 0, STAGE_SIZE, STAGE_SIZE);

  if (t < 3000) {
    // 入れかわりの間隔: 450ms → 50ms
    const period = Math.max(50, 450 - (t / 3000) * 400);
    const showNew = t > 700 && Math.floor(t / period) % 2 === 1;
    const species = showNew ? look.toSpecies : look.fromSpecies;
    const stage = showNew ? look.toStage : look.fromStage;
    drawPet(lc, { speciesId: species, stage, equipped: {}, pose: "idle", t }, cx, GROUND, speciesPalette(species, stage));
    if (t > 700) silhouette(lc);
    ctx.drawImage(layer, 0, 0);
    flash(ctx, (t - 2600) / 400);
    return;
  }

  const p = speciesPalette(look.toSpecies, look.toStage);
  drawPet(ctx, { speciesId: look.toSpecies, stage: look.toStage, equipped: {}, pose: t > 3400 ? "happy" : "idle", t }, cx, GROUND, p);
  if (t > 3200) drawSparkles(ctx, t, p, 7);
  flash(ctx, 1 - (t - 3000) / 500);
}

let layerCanvas: HTMLCanvasElement | null = null;
function offscreen() {
  if (!layerCanvas) {
    layerCanvas = document.createElement("canvas");
    layerCanvas.width = STAGE_SIZE;
    layerCanvas.height = STAGE_SIZE;
  }
  return layerCanvas;
}
