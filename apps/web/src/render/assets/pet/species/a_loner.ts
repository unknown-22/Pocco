// ひとりずき（おとな）: 背の高い四角。すました目

import type { SpeciesArt } from "../body.ts";
import { box } from "../shapes.ts";

export default {
  shape: box,
  size: [-2, 1],
  face: { eyeH: 1, cheeks: false },
} satisfies SpeciesArt;
