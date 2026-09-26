// 食べ物: 焼き魚

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    "..fffffff...",
    ".fFFFFFFFf.t",
    "fefgffgffftt",
    "ffffgffgfftt",
    ".fffffffff.t",
    "..fffffff...",
    "pppppppppppp",
  ],
  colors: { f: "#9fb3d0", F: "#c9d6ea", g: "#6b5a4a", e: "#4a3656", t: "#7f93b8", p: "#d8e6ea" },
} satisfies Sprite;
