// 家具: かざり棚

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    ".r..b..y..g..r.",
    "rRr.bB.yY.gG.rR",
    "wwwwwwwwwwwwwww",
    ".W...........W.",
  ],
  colors: { w: "#b98a64", W: "#8f6444", r: "#e8736f", R: "#c95550", b: "#6f9fe0", B: "#4f7fc0", y: "#f2c75c", Y: "#d9a93f", g: "#7fc58e", G: "#5aa86b" },
} satisfies Sprite;
