// シニアになったときの演出: やわらかい光の中で、少し白くなって眼鏡をかけた姿

import { drawPet } from "../pet.ts";
import { GROUND, STAGE_SIZE, drawBackdrop, speciesPalette } from "./common.ts";

export const SENIOR_MS = 2600;

/** ゆっくり落ちてくる光の粒 */
const MOTES = [[8, 0], [20, 900], [36, 400], [50, 1300], [58, 700], [28, 1700]] as const;

export function drawSenior(ctx: CanvasRenderingContext2D, t: number, speciesId: string, fromStage: string) {
  drawBackdrop(ctx, "#f7eedf", "#e8d8bf");
  for (const [x, delay] of MOTES) {
    const y = ((t + delay) / 40) % (GROUND + 4);
    ctx.fillStyle = "#fff4b8";
    ctx.fillRect(x, Math.floor(y), 1, 1);
  }
  // はじめは前の姿、途中から少しずつシニアの姿に
  const stage = t < 1200 ? fromStage : "senior";
  const eyesClosed = t > 900 && t < 1500;
  drawPet(ctx, { speciesId, stage, equipped: {}, pose: "idle", t, eyesClosed }, STAGE_SIZE / 2, GROUND, speciesPalette(speciesId, stage));
}
