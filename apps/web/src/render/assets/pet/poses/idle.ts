// 待機: ゆっくり息をする

import type { PoseArt } from "../pose.ts";

export default {
  frameMs: 700,
  blink: true,
  frames: [{}, { squash: 1 }],
} satisfies PoseArt;
