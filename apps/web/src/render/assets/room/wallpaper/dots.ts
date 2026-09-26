// 壁紙の模様: 水玉

import type { PatternArt } from "../../../sprite.ts";
import { FLOOR_Y, ROOM_SIZE } from "../../../layout.ts";

export default ((fill, accent) => {
  for (let y = 4, i = 0; y < FLOOR_Y - 4; y += 8, i++) {
    for (let x = (i % 2) * 4 + 2; x < ROOM_SIZE; x += 8) fill(x, y, 2, 2, accent);
  }
}) satisfies PatternArt;
