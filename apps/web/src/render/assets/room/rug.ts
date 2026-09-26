// ラグ（固定・部屋の真ん中の手前）

import type { RoomPartArt } from "../../sprite.ts";

export default ((fill, p) => {
  const cx = 60, cy = 110;
  for (let dy = -6; dy <= 6; dy++) {
    const half = Math.round(28 * Math.sqrt(1 - (dy / 7) ** 2));
    fill(cx - half, cy + dy, half * 2, 1, dy > 3 ? p.rugShade : p.rug);
  }
}) satisfies RoomPartArt;
