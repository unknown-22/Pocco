// 食べ物: にんじん

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    "..........gg",
    "........g.g.",
    ".......oogg.",
    "......oOoo..",
    ".....ooooO..",
    "....oOooo...",
    "...ooooO....",
    "..oOooo.....",
    "..oooO......",
    ".ooo........",
    ".oo.........",
  ],
  colors: { o: "#f59a3c", O: "#d9772a", g: "#5aa86b" },
} satisfies Sprite;
