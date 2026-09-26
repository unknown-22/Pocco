// はしりや（おとな）: 背の高いまめ型

import type { SpeciesArt } from "../body.ts";
import { manju } from "../shapes.ts";

export default {
  shape: manju,
  size: [-3, 2],
  face: { mouth: "smile", eyeY: 0.36 },
} satisfies SpeciesArt;
