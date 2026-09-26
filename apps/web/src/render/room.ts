// 部屋の描画（内部解像度 128×128、仕様書 5.1）。
// 窓・冷蔵庫・ベッド・ラグは固定。壁紙・床・家具（4 か所）は模様替えできる（10.8）。
// 絵そのものは assets/ の個別ファイルにあり、ここでは並べるだけ。

import { getFloor, getFurniture, getWallpaper, type RoomState } from "@pocco/sim";
import { drawSprite, type RoomPalette } from "./sprite.ts";
import { FLOOR_PATTERNS, FURNITURE_SPRITES, ROOM_PARTS, WALLPAPER_PATTERNS } from "./assets/index.ts";
import { FLOOR_Y, ROOM_SIZE } from "./layout.ts";

export { FLOOR_Y, ROOM_SIZE };

/** 家具を置く場所（スプライトの左下の座標） */
export const SLOT_POS: Record<string, { x: number; bottom: number }> = {
  wall_left: { x: 28, bottom: 34 },
  wall_right: { x: 96, bottom: 44 },
  floor_left: { x: 28, bottom: FLOOR_Y + 12 },
  floor_right: { x: 76, bottom: FLOOR_Y + 12 },
};

export function drawRoom(
  ctx: CanvasRenderingContext2D,
  p: RoomPalette,
  night: boolean,
  decor: Pick<RoomState, "wallpaperId" | "floorId" | "furniture">,
) {
  const r = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };

  // 壁
  const wall = getWallpaper(decor.wallpaperId);
  r(0, 0, ROOM_SIZE, FLOOR_Y, p.hex(wall.base));
  WALLPAPER_PATTERNS[wall.pattern]?.(r, p.hex(wall.accent));
  r(0, FLOOR_Y - 3, ROOM_SIZE, 3, p.baseboard);

  // 床
  const floor = getFloor(decor.floorId);
  r(0, FLOOR_Y, ROOM_SIZE, ROOM_SIZE - FLOOR_Y, p.hex(floor.base));
  FLOOR_PATTERNS[floor.pattern]?.(r, p.hex(floor.accent));
  r(0, FLOOR_Y, ROOM_SIZE, 1, p.floorShade);

  ROOM_PARTS.window(r, p, night);
  ROOM_PARTS.fridge(r, p, night);
  ROOM_PARTS.bed(r, p, night);

  // 家具
  for (const [slot, id] of Object.entries(decor.furniture)) {
    const pos = SLOT_POS[slot];
    const sprite = FURNITURE_SPRITES[id];
    if (!pos || !sprite || !getFurniture(id)) continue;
    drawSprite(ctx, sprite, pos.x, pos.bottom - sprite.rows.length, p);
  }

  // ラグ
  ROOM_PARTS.rug(r, p, night);
}
