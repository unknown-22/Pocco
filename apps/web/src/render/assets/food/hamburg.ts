// 食べ物: ハンバーグ

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    "...ssssss...",
    "..sSssssss..",
    ".mmssssssmm.",
    ".mmmmmmmmmm.",
    ".mmmmmmmmmM.",
    "..mmmmmmMM..",
    "pppppppppppp",
    ".pppppppppp.",
  ],
  colors: { s: "#8a3a2a", S: "#b85a3a", m: "#a8683c", M: "#7a4a2a", p: "#d8e6ea" },
} satisfies Sprite;
