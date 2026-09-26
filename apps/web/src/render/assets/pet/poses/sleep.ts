// 寝る: 目を閉じて、ぺったり。ゆっくり息をする

import type { PoseArt } from "../pose.ts";

export default {
  frameMs: 1200,
  frames: [
    { eyes: "closed", squash: 1 },
    { eyes: "closed", squash: 2 },
  ],
} satisfies PoseArt;
