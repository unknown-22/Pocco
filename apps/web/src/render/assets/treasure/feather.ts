// 拾い物: 鳥の羽

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    "..........f.",
    ".........ff.",
    "........fFf.",
    ".......fFf..",
    "......fFf...",
    ".....fFf....",
    "....fFf.....",
    "...fFf......",
    "..fff.......",
    ".q..........",
    "q...........",
  ],
  colors: { f: "#e8e0f0", F: "#b8a8e8", q: "#8f8f9f" },
} satisfies Sprite;
