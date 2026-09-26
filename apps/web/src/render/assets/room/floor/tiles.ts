// 床の模様: タイル

import type { PatternArt } from "../../../sprite.ts";
import { FLOOR_Y, ROOM_SIZE } from "../../../layout.ts";

export default ((fill, accent) => {
  for (let y = FLOOR_Y + 9; y < ROOM_SIZE; y += 10) fill(0, y, ROOM_SIZE, 1, accent);
  for (let x = 6; x < ROOM_SIZE; x += 12) fill(x, FLOOR_Y, 1, ROOM_SIZE - FLOOR_Y, accent);
}) satisfies PatternArt;
