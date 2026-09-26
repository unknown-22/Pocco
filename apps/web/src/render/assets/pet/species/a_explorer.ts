// たんけんか（おとな）: すらっとしたしずく型

import type { SpeciesArt } from "../body.ts";
import { drop } from "../shapes.ts";

export default {
  shape: drop,
  size: [-2, 2],
  face: { eyeY: 0.5, mouth: "smile" },
} satisfies SpeciesArt;
