// アクセサリ: はなかざり

import type { AccessoryArt } from "../../../sprite.ts";

export default {
  anchor: "headLeft",
  sprite: {
    rows: [
      "..p..",
      ".pPp.",
      "pPyPp",
      ".pPp.",
      "..p..",
    ],
    colors: { p: "#f4a6c0", P: "#ffffff", y: "#ffd24d" },
  },
} satisfies AccessoryArt;
