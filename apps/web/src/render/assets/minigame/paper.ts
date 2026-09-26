// ミニゲーム: キャッチの紙くず

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    ".pp.",
    "pPpp",
    "ppP.",
    ".pp.",
  ],
  colors: { p: "#fdfaf4", P: "#c9bfb0" },
} satisfies Sprite;
