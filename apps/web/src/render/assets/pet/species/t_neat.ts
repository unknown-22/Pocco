// きちんこ（ティーン）: 角の丸い四角。きちんとしている

import type { SpeciesArt } from "../body.ts";
import { box } from "../shapes.ts";

export default {
  shape: box,
  size: [-1, 0],
  face: { mouth: "dot" },
} satisfies SpeciesArt;
