// きょろこ（こども）: まんまるで、目が大きい

import type { SpeciesArt } from "../body.ts";
import { manju } from "../shapes.ts";

export default {
  shape: manju,
  face: { eyeX: 0.28, eyeY: 0.36, mouth: "dot" },
} satisfies SpeciesArt;
