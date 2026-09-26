// 壁紙の模様: 星

import type { PatternArt } from "../../../sprite.ts";

const STARS = [[8, 6], [30, 20], [20, 50], [96, 10], [110, 30], [100, 60], [12, 70], [36, 64], [118, 72], [90, 52]] as const;

export default ((fill, accent) => {
  for (const [x, y] of STARS) {
    fill(x, y, 1, 1, accent);
    if ((x + y) % 3 === 0) {
      fill(x - 1, y, 3, 1, accent);
      fill(x, y - 1, 1, 3, accent);
    }
  }
}) satisfies PatternArt;
