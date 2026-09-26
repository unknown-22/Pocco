// あまえんぼ（おとな）: ふっくらしたおもち型

import type { SpeciesArt } from "../body.ts";
import { mochi } from "../shapes.ts";

export default {
  shape: mochi,
  size: [1, -1],
  face: { mouth: "smile", eyeX: 0.28 },
} satisfies SpeciesArt;
