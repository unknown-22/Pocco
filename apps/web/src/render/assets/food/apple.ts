// 食べ物: りんご

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    "......s.ll..",
    "......sll...",
    "..rrrrsrrr..",
    ".rRWrrrrrrr.",
    ".rRrrrrrrrr.",
    "rrrrrrrrrrrd",
    "rrrrrrrrrrrd",
    "rrrrrrrrrrdd",
    ".rrrrrrrrdd.",
    ".drrrrrrddd.",
    "..ddd..ddd..",
  ],
  colors: { r: "#e8505b", R: "#ff8a8a", W: "#ffffff", d: "#b8323f", s: "#8f6444", l: "#7fc58e" },
} satisfies Sprite;
