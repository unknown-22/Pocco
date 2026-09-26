// ふわこ（こども）: ぺったりしたおもち型。のんびり

import type { SpeciesArt } from "../body.ts";
import { mochi } from "../shapes.ts";

export default {
  shape: mochi,
  size: [2, -2],
  face: { eyeH: 1, eyeY: 0.45 },
} satisfies SpeciesArt;
