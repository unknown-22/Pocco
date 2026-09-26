// 旅立ちの場面（仕様書 7.3）: 夕方の部屋のベッドで、目を閉じて、暗くなり、光の玉になって窓の外へ

import { getSpecies, type RoomState } from "@pocco/sim";
import { paletteFor, withSpecies } from "../palette.ts";
import { drawRoom, FLOOR_Y, ROOM_SIZE } from "../room.ts";
import { drawPet } from "../pet.ts";
import { KEEPSAKE, LIGHT } from "../assets/index.ts";
import { drawSprite } from "../sprite.ts";

export type FarewellPhase = "words" | "closing" | "light";

/** 暗くなるのにかける時間 */
export const CLOSING_MS = 3500;
/** 光が窓の外へ消えるまで */
export const LIGHT_MS = 4000;

const BED = { x: 108, bottom: FLOOR_Y + 6 };
const WINDOW = { x: 64, y: 30 };

/** phaseT は、そのフェーズに入ってからの時間 */
export function drawFarewell(
  ctx: CanvasRenderingContext2D,
  room: RoomState,
  speciesId: string,
  phase: FarewellPhase,
  phaseT: number,
) {
  const p = withSpecies(paletteFor("evening"), "evening", getSpecies(speciesId).colors, true);
  drawRoom(ctx, p, false, room);
  if (room.keepsakeItemId) drawSprite(ctx, KEEPSAKE, 76, 43, p);

  const dark = phase === "words" ? 0.3 : phase === "closing" ? 0.3 + 0.45 * Math.min(1, phaseT / CLOSING_MS) : 0.75;
  const k = phase === "light" ? Math.min(1, phaseT / LIGHT_MS) : 0;

  // ペット（光になると消えていく）
  const fade = phase === "light" ? Math.max(0, 1 - phaseT / 900) : 1;
  if (fade > 0) {
    ctx.globalAlpha = fade;
    drawPet(ctx, { speciesId, stage: "senior", equipped: {}, eyesClosed: phase !== "words", pose: "idle", t: phase === "words" ? phaseT : 0 }, BED.x, BED.bottom, p);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = `rgba(10, 8, 24, ${dark})`;
  ctx.fillRect(0, 0, ROOM_SIZE, ROOM_SIZE);

  if (phase === "light") {
    // ベッドから窓へ、ふわっと弧をえがいて上がり、窓の外で消える
    const e = k * k * (3 - 2 * k);
    const x = BED.x + (WINDOW.x - BED.x) * e;
    const y = BED.bottom - 10 + (WINDOW.y - (BED.bottom - 10)) * e - Math.sin(e * Math.PI) * 14 - (k > 0.8 ? (k - 0.8) * 60 : 0);
    const glow = k < 0.15 ? k / 0.15 : k > 0.85 ? (1 - k) / 0.15 : 1;
    ctx.globalAlpha = Math.max(0, glow);
    // まわりのにじみ（十字に広がる淡い光）
    ctx.fillStyle = "#fff4b82a";
    ctx.fillRect(Math.round(x) - 7, Math.round(y) - 2, 15, 5);
    ctx.fillRect(Math.round(x) - 2, Math.round(y) - 7, 5, 15);
    drawSprite(ctx, LIGHT, Math.round(x) - 3, Math.round(y) - 3 + (Math.floor(phaseT / 300) % 2), p);
    ctx.globalAlpha = 1;
  }
}
