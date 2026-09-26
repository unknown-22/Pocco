// かけっこ（ティーン）: 背の高いまめ型

import type { SpeciesArt } from "../body.ts";
import { manju } from "../shapes.ts";

export default {
  shape: manju,
  size: [-2, 2],
  face: { mouth: "smile", eyeY: 0.38 },
} satisfies SpeciesArt;
