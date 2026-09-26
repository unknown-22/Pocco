// 頭の飾り: つの（種族の色で塗る）

import type { Sprite } from "../../../sprite.ts";

export default {
  rows: [
    ".f.",
    ".f.",
    "fFf",
  ],
  colors: { f: "feature", F: "featureShade" },
} satisfies Sprite;
