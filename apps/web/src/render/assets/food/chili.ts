// 食べ物: とうがらし

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    "........gg..",
    ".......g.g..",
    "......rg....",
    ".....rRr....",
    "....rRr.....",
    "...rrr......",
    "..rrr.......",
    ".rrd........",
    ".rd.........",
    "d...........",
  ],
  colors: { r: "#e8403a", R: "#ff8a7a", d: "#b8302a", g: "#5aa86b" },
} satisfies Sprite;
