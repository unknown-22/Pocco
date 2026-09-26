// 食べ物: おすし

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    "...ssssss...",
    ".ssSsSsSsss.",
    "sssssssssssd",
    ".wwwwwwwwww.",
    "wwwwwwwwwwwo",
    ".wwwwwwwwoo.",
    "..oooooooo..",
  ],
  colors: { s: "#ff9a6b", S: "#ffd0b8", d: "#e0784a", w: "#fdfaf4", o: "#d9cfc0" },
} satisfies Sprite;
