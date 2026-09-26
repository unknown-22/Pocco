// 食べ物: トマト

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    ".....gg.....",
    "...gggggg...",
    "..rrgrrgrr..",
    ".rRrrrrrrrr.",
    "rRWrrrrrrrrd",
    "rRrrrrrrrrrd",
    "rrrrrrrrrrrd",
    "rrrrrrrrrrdd",
    ".rrrrrrrrdd.",
    "..rrrrrrdd..",
    "....dddd....",
  ],
  colors: { r: "#f0503c", R: "#ff9a8a", W: "#ffffff", d: "#c0342a", g: "#5aa86b" },
} satisfies Sprite;
