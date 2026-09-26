// 壁紙の模様: 木のパネル

import type { PatternArt } from "../../../sprite.ts";
import { FLOOR_Y, ROOM_SIZE } from "../../../layout.ts";

export default ((fill, accent) => {
  for (let x = 0; x < ROOM_SIZE; x += 16) fill(x, 0, 1, FLOOR_Y, accent);
  fill(0, FLOOR_Y - 20, ROOM_SIZE, 1, accent);
}) satisfies PatternArt;
