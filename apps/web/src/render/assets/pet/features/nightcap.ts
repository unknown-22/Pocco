// 頭の飾り: ナイトキャップ（種族の色で塗る）

import type { Sprite } from "../../../sprite.ts";

export default {
  rows: [
    "....fF",
    "...ff.",
    "..fff.",
    ".ffff.",
    "FFFFFF",
  ],
  colors: { f: "feature", F: "featureShade" },
} satisfies Sprite;
