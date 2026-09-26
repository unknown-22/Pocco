// あさやけ（おとな）: しずく型の、にっこり顔

import type { SpeciesArt } from "../body.ts";
import { drop } from "../shapes.ts";

export default {
  shape: drop,
  face: { mouth: "smile", eyeY: 0.48 },
} satisfies SpeciesArt;
