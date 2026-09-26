// 窓ぎわの形見（小さな箱）

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    "..rr..",
    "bbrrbb",
    "bBrrBb",
    "bBrrBb",
    "bbbbbb",
  ],
  colors: { b: "box", B: "boxShade", r: "boxRibbon" },
} satisfies Sprite;
