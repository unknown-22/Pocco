// 散らかり: 食べかす

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    "c..c",
    ".c..",
    "..cc",
  ],
  colors: { c: "crumb" },
} satisfies Sprite;
