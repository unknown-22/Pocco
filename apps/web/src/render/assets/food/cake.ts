// 食べ物: ケーキ

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    ".....rr.....",
    "....rRrr....",
    "..wwwrrwww..",
    ".wwwwwwwwww.",
    ".ssssssssss.",
    ".ssssssssss.",
    ".wwrwwwwrww.",
    ".ssssssssss.",
    ".ssssssssss.",
    ".SSSSSSSSSS.",
    "pppppppppppp",
  ],
  colors: { r: "#e8505b", R: "#ff9a9a", w: "#fffaf0", s: "#ffe0a0", S: "#e8c080", p: "#d8e6ea" },
} satisfies Sprite;
