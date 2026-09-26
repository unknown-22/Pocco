// 拾い物: きれいな石

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    "....ssss....",
    "..sssWssss..",
    ".sssWsssssd.",
    ".sssssssssd.",
    "ssssssssssdd",
    ".sssssssddd.",
    "..dddddddd..",
  ],
  colors: { s: "#a8c4d8", W: "#e8f4fb", d: "#7f9db8" },
} satisfies Sprite;
