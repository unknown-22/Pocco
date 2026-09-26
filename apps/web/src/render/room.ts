// 部屋の描画（内部解像度 128×128、仕様書 5.1）。
// 窓・冷蔵庫・ベッド・ラグは固定。壁紙・床・家具（4 か所）は模様替えできる（10.8）。

import { getFloor, getFurniture, getWallpaper, type RoomState } from "@pocco/sim";
import type { paletteFor } from "./palette.ts";
import { drawSprite } from "./sprites.ts";
import { FURNITURE_SPRITES } from "./decor.ts";

export const ROOM_SIZE = 128;
export const FLOOR_Y = 82;

type P = ReturnType<typeof paletteFor>;

/** 家具を置く場所（スプライトの左下の座標） */
export const SLOT_POS: Record<string, { x: number; bottom: number }> = {
  wall_left: { x: 28, bottom: 34 },
  wall_right: { x: 96, bottom: 44 },
  floor_left: { x: 28, bottom: FLOOR_Y + 12 },
  floor_right: { x: 76, bottom: FLOOR_Y + 12 },
};

export function drawRoom(
  ctx: CanvasRenderingContext2D,
  p: P,
  night: boolean,
  decor: Pick<RoomState, "wallpaperId" | "floorId" | "furniture">,
) {
  const r = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };

  // 壁
  const wall = getWallpaper(decor.wallpaperId);
  const wb = p.hex(wall.base);
  const wa = p.hex(wall.accent);
  r(0, 0, ROOM_SIZE, FLOOR_Y, wb);
  switch (wall.pattern) {
    case "stripe":
      for (let x = 4; x < ROOM_SIZE; x += 8) r(x, 0, 2, FLOOR_Y - 2, wa);
      break;
    case "dots":
      for (let y = 4, i = 0; y < FLOOR_Y - 4; y += 8, i++) {
        for (let x = (i % 2) * 4 + 2; x < ROOM_SIZE; x += 8) r(x, y, 2, 2, wa);
      }
      break;
    case "check":
      for (let y = 0; y < FLOOR_Y; y += 8) for (let x = ((y / 8) % 2) * 8; x < ROOM_SIZE; x += 16) r(x, y, 8, 8, wa);
      break;
    case "stars":
      for (const [x, y] of [[8, 6], [30, 20], [20, 50], [96, 10], [110, 30], [100, 60], [12, 70], [36, 64], [118, 72], [90, 52]]) {
        r(x!, y!, 1, 1, wa);
        if ((x! + y!) % 3 === 0) {
          r(x! - 1, y!, 3, 1, wa);
          r(x!, y! - 1, 1, 3, wa);
        }
      }
      break;
    case "panel":
      for (let x = 0; x < ROOM_SIZE; x += 16) r(x, 0, 1, FLOOR_Y, wa);
      r(0, FLOOR_Y - 20, ROOM_SIZE, 1, wa);
      break;
  }
  r(0, FLOOR_Y - 3, ROOM_SIZE, 3, p.baseboard);

  // 床
  const floor = getFloor(decor.floorId);
  const fb = p.hex(floor.base);
  const fa = p.hex(floor.accent);
  r(0, FLOOR_Y, ROOM_SIZE, ROOM_SIZE - FLOOR_Y, fb);
  switch (floor.pattern) {
    case "planks":
      for (let y = FLOOR_Y + 7, i = 0; y < ROOM_SIZE; y += 8, i++) {
        r(0, y, ROOM_SIZE, 1, fa);
        for (let x = (i % 2) * 16 + 10; x < ROOM_SIZE; x += 32) r(x, y - 7, 1, 7, fa);
      }
      break;
    case "tiles":
      for (let y = FLOOR_Y + 9; y < ROOM_SIZE; y += 10) r(0, y, ROOM_SIZE, 1, fa);
      for (let x = 6; x < ROOM_SIZE; x += 12) r(x, FLOOR_Y, 1, ROOM_SIZE - FLOOR_Y, fa);
      break;
    case "carpet":
      for (let y = FLOOR_Y + 3, i = 0; y < ROOM_SIZE; y += 5, i++) {
        for (let x = (i % 2) * 3; x < ROOM_SIZE; x += 6) r(x, y, 1, 1, fa);
      }
      break;
  }
  r(0, FLOOR_Y, ROOM_SIZE, 1, p.floorShade);

  // 窓
  const wx = 44, wy = 14, ww = 40, wh = 32;
  r(wx - 2, wy - 2, ww + 4, wh + 4, p.windowFrameShade);
  r(wx - 2, wy - 2, ww + 3, wh + 3, p.windowFrame);
  r(wx, wy, ww, wh, p.skyLow);
  r(wx, wy, ww, Math.floor(wh * 0.6), p.sky);
  if (night) {
    for (const [sx, sy] of [[6, 5], [22, 9], [33, 4], [14, 16], [29, 20]] as const) {
      r(wx + sx, wy + sy, 1, 1, "#fff4b8");
    }
    r(wx + 30, wy + 8, 3, 3, "#fff4b8");
  } else {
    r(wx + 6, wy + 8, 8, 2, "#ffffffcc");
    r(wx + 8, wy + 6, 5, 2, "#ffffffcc");
  }
  r(wx + ww / 2 - 1, wy, 2, wh, p.windowFrame);
  r(wx, wy + wh / 2 - 1, ww, 2, p.windowFrame);
  r(wx - 4, wy + wh + 1, ww + 8, 3, p.windowFrameShade);

  // 冷蔵庫（左）
  const fx = 4, fy = 38, fw = 22, fh = FLOOR_Y + 12 - 38;
  r(fx, fy, fw, fh, p.fridgeShade);
  r(fx, fy, fw - 2, fh - 1, p.fridge);
  r(fx, fy + 18, fw - 2, 1, p.fridgeShade);
  r(fx + fw - 6, fy + 6, 2, 8, p.fridgeHandle);
  r(fx + fw - 6, fy + 22, 2, 12, p.fridgeHandle);

  // ベッド（右）
  const bx = 92, by = FLOOR_Y + 2, bw = 34;
  r(bx, by - 12, 3, 26, p.bedFrame);
  r(bx, by, bw, 12, p.bedFrame);
  r(bx + 2, by - 2, bw - 2, 10, p.bed);
  r(bx + 2, by + 6, bw - 2, 2, p.bedShade);
  r(bx + 4, by - 5, 10, 5, p.pillow);

  // 家具
  for (const [slot, id] of Object.entries(decor.furniture)) {
    const pos = SLOT_POS[slot];
    const sprite = FURNITURE_SPRITES[id];
    if (!pos || !sprite || !getFurniture(id)) continue;
    drawSprite(ctx, sprite, pos.x, pos.bottom - sprite.rows.length, p);
  }

  // ラグ
  const cx = 60, cy = 110;
  for (let dy = -6; dy <= 6; dy++) {
    const half = Math.round(28 * Math.sqrt(1 - (dy / 7) ** 2));
    r(cx - half, cy + dy, half * 2, 1, dy > 3 ? p.rugShade : p.rug);
  }
}
