// 窓（固定）。空の色は時間帯で変わり、夜は星が出る

import type { RoomPartArt } from "../../sprite.ts";

export default ((fill, p, night) => {
  const wx = 44, wy = 14, ww = 40, wh = 32;
  fill(wx - 2, wy - 2, ww + 4, wh + 4, p.windowFrameShade);
  fill(wx - 2, wy - 2, ww + 3, wh + 3, p.windowFrame);
  fill(wx, wy, ww, wh, p.skyLow);
  fill(wx, wy, ww, Math.floor(wh * 0.6), p.sky);
  if (night) {
    for (const [sx, sy] of [[6, 5], [22, 9], [33, 4], [14, 16], [29, 20]] as const) {
      fill(wx + sx, wy + sy, 1, 1, "#fff4b8");
    }
    fill(wx + 30, wy + 8, 3, 3, "#fff4b8");
  } else {
    fill(wx + 6, wy + 8, 8, 2, "#ffffffcc");
    fill(wx + 8, wy + 6, 5, 2, "#ffffffcc");
  }
  fill(wx + ww / 2 - 1, wy, 2, wh, p.windowFrame);
  fill(wx, wy + wh / 2 - 1, ww, 2, p.windowFrame);
  fill(wx - 4, wy + wh + 1, ww + 8, 3, p.windowFrameShade);
}) satisfies RoomPartArt;
