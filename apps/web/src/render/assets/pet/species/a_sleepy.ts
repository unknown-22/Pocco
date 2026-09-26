// ねぼすけ（おとな）: 横にのびたおもち型。いつも眠そう

import type { SpeciesArt } from "../body.ts";
import { mochi } from "../shapes.ts";

export default {
  shape: mochi,
  size: [4, -3],
  face: { eyeH: 1, eyeY: 0.48 },
} satisfies SpeciesArt;
