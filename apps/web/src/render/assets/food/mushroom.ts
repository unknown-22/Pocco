// 食べ物: なぞのきのこ

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    "....rrrr....",
    "..rrwrrrrr..",
    ".rrrrrrwrrr.",
    "rrwrrrrrrrrr",
    "rrrrrrwrrrrd",
    ".dddddddddd.",
    "....wwww....",
    "....wwwW....",
    "....wwwW....",
    "...wwwwWW...",
  ],
  colors: { r: "#9d6fd6", d: "#7450b0", w: "#fdfaf4", W: "#d9cfc0" },
} satisfies Sprite;
