// 壁紙の模様: しま

import type { PatternArt } from "../../../sprite.ts";
import { FLOOR_Y, ROOM_SIZE } from "../../../layout.ts";

export default ((fill, accent) => {
  for (let x = 4; x < ROOM_SIZE; x += 8) fill(x, 0, 2, FLOOR_Y - 2, accent);
}) satisfies PatternArt;
