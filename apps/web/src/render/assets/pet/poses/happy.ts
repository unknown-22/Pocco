// 喜ぶ: にっこりして跳ねる。ハートが出る

import type { PoseArt } from "../pose.ts";

export default {
  frameMs: 220,
  frames: [
    { eyes: "happy", mouth: "smile", squash: 1, mark: "heart" },
    { eyes: "happy", mouth: "smile", dy: -2, mark: "heart" },
    { eyes: "happy", mouth: "smile", dy: -4, mark: "heart" },
    { eyes: "happy", mouth: "smile", dy: -2, mark: "heart" },
  ],
} satisfies PoseArt;
