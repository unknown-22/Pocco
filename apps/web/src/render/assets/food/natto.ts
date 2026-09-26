// 食べ物: なっとう

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    "...nnnnnn...",
    "..nNnnnNnn..",
    ".nnnnNnnnnn.",
    "bbbbbbbbbbbb",
    ".bBbbbbbbbb.",
    ".bbbbbbbbbb.",
    "..bbbbbbbb..",
    "...bbbbbb...",
  ],
  colors: { n: "#b8904a", N: "#e8c888", b: "#6f9fe0", B: "#a8c8f4" },
} satisfies Sprite;
