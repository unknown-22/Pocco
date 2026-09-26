// ミニゲーム: キャッチのりんご

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    "..g..",
    ".rrr.",
    "rRrrr",
    "rrrrr",
    ".rrr.",
  ],
  colors: { g: "#5aa86b", r: "#e8736f", R: "#ffb8b0" },
} satisfies Sprite;
