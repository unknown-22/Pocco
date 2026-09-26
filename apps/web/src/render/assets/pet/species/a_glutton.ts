// くいしんぼ大将（おとな）: 大きなおまんじゅう型

import type { SpeciesArt } from "../body.ts";
import { manju } from "../shapes.ts";

export default {
  shape: manju,
  size: [3, 1],
  face: { mouth: "cat" },
} satisfies SpeciesArt;
