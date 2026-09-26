// 食べ物: クッキー

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    "....kkkk....",
    "..kkkkkkkk..",
    ".kkckkkkckk.",
    ".kkkkkkkkkK.",
    "kkkkkckkkkkK",
    "kkckkkkkkckK",
    "kkkkkkkkkkKK",
    ".kkkkkckkkK.",
    ".kKkkkkkkKK.",
    "..KKkkkkKK..",
    "....KKKK....",
  ],
  colors: { k: "#e0aa6a", K: "#b87a3c", c: "#6b4a3a" },
} satisfies Sprite;
