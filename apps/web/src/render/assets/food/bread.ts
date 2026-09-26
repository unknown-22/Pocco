// 食べ物: パン

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    "...bbbbbb...",
    "..bBBBBBBb..",
    ".bBbbbbbbBb.",
    "bBbbbbbbbbBb",
    "bbbbbbbbbbbb",
    "bccccccccccb",
    "bccccccccccb",
    "bccccccccccb",
    "bccccccccccb",
    ".bbbbbbbbbb.",
  ],
  colors: { b: "#c98a3c", B: "#e8b060", c: "#fff0d0" },
} satisfies Sprite;
