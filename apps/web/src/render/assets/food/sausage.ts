// 食べ物: ウインナー

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    "..ssssssss..",
    ".sSmssmssms.",
    ".ssssssssss.",
    "bbbbbbbbbbbb",
    "bBBBBBBBBBBb",
    ".bbbbbbbbbb.",
  ],
  colors: { s: "#c9503c", S: "#e8806a", m: "#ffd24d", b: "#c98a3c", B: "#e8b060" },
} satisfies Sprite;
