// 拾い物: 星のかけら

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    ".....s......",
    ".....s......",
    "....sss.....",
    "sssssWsssss.",
    ".sssWsssss..",
    "..sssssss...",
    "..sss.sss...",
    ".ss.....ss..",
  ],
  colors: { s: "#ffe28a", W: "#ffffff" },
} satisfies Sprite;
