// もぐっこ（ティーン）: 横に広いおもち型

import type { SpeciesArt } from "../body.ts";
import { mochi } from "../shapes.ts";

export default {
  shape: mochi,
  size: [2, -1],
  face: { mouth: "cat", eyeY: 0.42 },
} satisfies SpeciesArt;
