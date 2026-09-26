// 食べ物: おにぎり

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    ".....oo.....",
    "....owwo....",
    "...owwwwo...",
    "...owwwwo...",
    "..owwwwwwo..",
    "..owwwwwwo..",
    ".owwwwwwwwo.",
    ".owwnnnnwwo.",
    "owwwnnnnwwwo",
    "owwwnnnnwwwo",
    ".oooooooooo.",
  ],
  colors: { o: "#c9bfb0", w: "#fdfaf4", n: "#3f4a3a" },
} satisfies Sprite;
