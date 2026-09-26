// ひだまりポッコ（おとな）: ふつうのおまんじゅう型

import type { SpeciesArt } from "../body.ts";
import { manju } from "../shapes.ts";

export default {
  shape: manju,
  face: { mouth: "smile" },
} satisfies SpeciesArt;
