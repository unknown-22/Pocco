// 頭の飾り: ねこみみ（種族の色で塗る）

import type { Sprite } from "../../../sprite.ts";

export default {
  rows: [
    "o.......o",
    "ff.....ff",
    "fF.....Ff",
  ],
  colors: { f: "feature", F: "featureShade", o: "bodyLine" },
} satisfies Sprite;
