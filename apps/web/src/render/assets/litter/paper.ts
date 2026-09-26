// 散らかり: 紙くず

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    ".pp.",
    "pPpp",
    "ppP.",
    ".pp.",
  ],
  colors: { p: "paper", P: "paperShade" },
} satisfies Sprite;
