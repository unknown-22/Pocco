// 食べる: 口をあけて、もぐもぐ

import type { PoseArt } from "../pose.ts";

export default {
  frameMs: 300,
  frames: [{ mouth: "open" }, { mouth: "normal", squash: 1 }, { mouth: "open" }, { mouth: "normal", squash: 1, eyes: "happy" }],
} satisfies PoseArt;
