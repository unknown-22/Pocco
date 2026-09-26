// 遊ぶ: はしゃいで、ぴょんぴょん跳ねる

import type { PoseArt } from "../pose.ts";

export default {
  frameMs: 200,
  frames: [
    { eyes: "happy", mouth: "open", squash: 1 },
    { eyes: "happy", mouth: "open", dy: -2 },
    { eyes: "happy", mouth: "open", dy: -3 },
    { eyes: "happy", mouth: "open", dy: -2 },
    { mouth: "smile" },
    { mouth: "smile" },
  ],
} satisfies PoseArt;
