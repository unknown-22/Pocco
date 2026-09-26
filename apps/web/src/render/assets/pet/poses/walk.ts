// 歩き: 左右の足を交互に出して、少し跳ねる

import type { PoseArt } from "../pose.ts";

export default {
  frameMs: 250,
  blink: true,
  frames: [{ foot: "left", dy: -1 }, { foot: "right" }],
} satisfies PoseArt;
