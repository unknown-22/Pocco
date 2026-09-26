// 頭の飾り: ふたば（種族の色で塗る）

import type { Sprite } from "../../../sprite.ts";

export default {
  rows: [
    "f.f",
    ".f.",
    ".F.",
  ],
  colors: { f: "feature", F: "featureShade" },
} satisfies Sprite;
