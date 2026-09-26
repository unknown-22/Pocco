// 冷蔵庫（固定・左）

import type { RoomPartArt } from "../../sprite.ts";
import { FLOOR_Y } from "../../layout.ts";

export default ((fill, p) => {
  const fx = 4, fy = 38, fw = 22, fh = FLOOR_Y + 12 - 38;
  fill(fx, fy, fw, fh, p.fridgeShade);
  fill(fx, fy, fw - 2, fh - 1, p.fridge);
  fill(fx, fy + 18, fw - 2, 1, p.fridgeShade);
  fill(fx + fw - 6, fy + 6, 2, 8, p.fridgeHandle);
  fill(fx + fw - 6, fy + 22, 2, 12, p.fridgeHandle);
}) satisfies RoomPartArt;
