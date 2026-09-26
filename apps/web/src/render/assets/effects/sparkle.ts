// 写真のきらっ（自撮り）

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    "..s..",
    ".sSs.",
    "sSSSs",
    ".sSs.",
    "..s..",
  ],
  colors: { s: "boxRibbon", S: "note" },
} satisfies Sprite;
