// 頭の飾り: うさみみ（種族の色で塗る）

import type { Sprite } from "../../../sprite.ts";

export default {
  rows: [
    ".f...f.",
    "fF...Ff",
    "fF...Ff",
    "fF...Ff",
    ".f...f.",
  ],
  colors: { f: "feature", F: "featureShade" },
} satisfies Sprite;
