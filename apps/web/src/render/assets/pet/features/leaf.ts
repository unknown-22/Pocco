// 頭の飾り: はっぱ（種族の色で塗る）

import type { Sprite } from "../../../sprite.ts";

export default {
  rows: [
    "..ff",
    ".fFf",
    "fFf.",
    ".f..",
  ],
  colors: { f: "feature", F: "featureShade" },
} satisfies Sprite;
