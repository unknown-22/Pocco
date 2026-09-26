// 怒る: 眉をつり上げて、ぷるぷるふるえる

import type { PoseArt } from "../pose.ts";

export default {
  frameMs: 120,
  frames: [
    { eyes: "angry", mouth: "frown", dx: -1, mark: "anger" },
    { eyes: "angry", mouth: "frown", dx: 1, mark: "anger" },
  ],
} satisfies PoseArt;
