// 食べ物: プリン

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    "....cccc....",
    "...cccccc...",
    "...yyyyyy...",
    "..yyyyyyyy..",
    "..yWyyyyyy..",
    ".yyyyyyyyyy.",
    ".yyyyyyyyyY.",
    "yyyyyyyyyyYY",
    "pppppppppppp",
    ".pppppppppp.",
  ],
  colors: { c: "#b8702a", y: "#ffd88a", Y: "#e8b860", W: "#fff6d8", p: "#d8e6ea" },
} satisfies Sprite;
