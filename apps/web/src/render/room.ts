// 部屋の描画（内部解像度 128×128、仕様書 5.1）。家具は P4 でデータ駆動にする。

import type { paletteFor } from "./palette.ts";

export const ROOM_SIZE = 128;
export const FLOOR_Y = 82;

type P = ReturnType<typeof paletteFor>;

export function drawRoom(ctx: CanvasRenderingContext2D, p: P, night: boolean) {
  const r = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };

  // 壁（縦じま）
  r(0, 0, ROOM_SIZE, FLOOR_Y, p.wall);
  for (let x = 4; x < ROOM_SIZE; x += 8) r(x, 0, 2, FLOOR_Y - 2, p.wallStripe);
  r(0, FLOOR_Y - 3, ROOM_SIZE, 3, p.baseboard);

  // 床（板張り）
  r(0, FLOOR_Y, ROOM_SIZE, ROOM_SIZE - FLOOR_Y, p.floor);
  for (let y = FLOOR_Y + 7, i = 0; y < ROOM_SIZE; y += 8, i++) {
    r(0, y, ROOM_SIZE, 1, p.floorLine);
    for (let x = (i % 2) * 16 + 10; x < ROOM_SIZE; x += 32) r(x, y - 7, 1, 7, p.floorLine);
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

  // ラグ
  const cx = 60, cy = 110;
  for (let dy = -6; dy <= 6; dy++) {
    const half = Math.round(28 * Math.sqrt(1 - (dy / 7) ** 2));
    r(cx - half, cy + dy, half * 2, 1, dy > 3 ? p.rugShade : p.rug);
  }
}
