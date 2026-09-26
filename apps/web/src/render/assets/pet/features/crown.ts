// 頭の飾り: かんむり（種族の色で塗る）

import type { Sprite } from "../../../sprite.ts";

export default {
  rows: [
    "f.f.f",
    "fffff",
    "FFFFF",
  ],
  colors: { f: "feature", F: "featureShade" },
} satisfies Sprite;
