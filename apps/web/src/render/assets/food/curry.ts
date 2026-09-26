// 食べ物: カレー

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    "..wwwwcccc..",
    ".wwwwccrccc.",
    "pwwwwcccCccp",
    "pwwwcccrcccp",
    ".pppppppppp.",
    "..pppppppp..",
  ],
  colors: { w: "#fdfaf4", c: "#d9962a", C: "#a86a1a", r: "#f5703c", p: "#d8e6ea" },
} satisfies Sprite;
