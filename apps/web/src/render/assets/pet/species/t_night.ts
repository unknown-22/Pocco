// よいっこ（ティーン）: 洋なし型で、眠そうな目

import type { SpeciesArt } from "../body.ts";
import { pear } from "../shapes.ts";

export default {
  shape: pear,
  face: { eyeH: 1, eyeY: 0.46 },
} satisfies SpeciesArt;
