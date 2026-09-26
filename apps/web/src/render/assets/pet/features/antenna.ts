// 頭の飾り: しょっかく（種族の色で塗る）

import type { Sprite } from "../../../sprite.ts";

export default {
  rows: [
    "F...F",
    ".f.f.",
    ".f.f.",
  ],
  colors: { f: "bodyLine", F: "feature" },
} satisfies Sprite;
