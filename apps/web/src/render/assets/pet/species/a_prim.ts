// おすまし（おとな）: 角の丸い四角。おすまし顔

import type { SpeciesArt } from "../body.ts";
import { box } from "../shapes.ts";

export default {
  shape: box,
  size: [-1, 0],
  face: { mouth: "dot", eyeY: 0.42 },
} satisfies SpeciesArt;
