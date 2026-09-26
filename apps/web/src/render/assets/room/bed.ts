// ベッド（固定・右）

import type { RoomPartArt } from "../../sprite.ts";
import { FLOOR_Y } from "../../layout.ts";

export default ((fill, p) => {
  const bx = 92, by = FLOOR_Y + 2, bw = 34;
  fill(bx, by - 12, 3, 26, p.bedFrame);
  fill(bx, by, bw, 12, p.bedFrame);
  fill(bx + 2, by - 2, bw - 2, 10, p.bed);
  fill(bx + 2, by + 6, bw - 2, 2, p.bedShade);
  fill(bx + 4, by - 5, 10, 5, p.pillow);
}) satisfies RoomPartArt;
