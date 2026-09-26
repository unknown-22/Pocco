// 壁紙の模様: チェック

import type { PatternArt } from "../../../sprite.ts";
import { FLOOR_Y, ROOM_SIZE } from "../../../layout.ts";

export default ((fill, accent) => {
  for (let y = 0; y < FLOOR_Y; y += 8) for (let x = ((y / 8) % 2) * 8; x < ROOM_SIZE; x += 16) fill(x, y, 8, 8, accent);
}) satisfies PatternArt;
