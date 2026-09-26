// 床の模様: カーペット

import type { PatternArt } from "../../../sprite.ts";
import { FLOOR_Y, ROOM_SIZE } from "../../../layout.ts";

export default ((fill, accent) => {
  for (let y = FLOOR_Y + 3, i = 0; y < ROOM_SIZE; y += 5, i++) {
    for (let x = (i % 2) * 3; x < ROOM_SIZE; x += 6) fill(x, y, 1, 1, accent);
  }
}) satisfies PatternArt;
