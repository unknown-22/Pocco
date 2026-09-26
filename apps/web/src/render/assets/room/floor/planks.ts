// 床の模様: 板張り（木の床・たたみ）

import type { PatternArt } from "../../../sprite.ts";
import { FLOOR_Y, ROOM_SIZE } from "../../../layout.ts";

export default ((fill, accent) => {
  for (let y = FLOOR_Y + 7, i = 0; y < ROOM_SIZE; y += 8, i++) {
    fill(0, y, ROOM_SIZE, 1, accent);
    for (let x = (i % 2) * 16 + 10; x < ROOM_SIZE; x += 32) fill(x, y - 7, 1, 7, accent);
  }
}) satisfies PatternArt;
