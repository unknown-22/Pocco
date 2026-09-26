// 夜ふかし詩人（おとな）: しずく型で、眠そうな目

import type { SpeciesArt } from "../body.ts";
import { drop } from "../shapes.ts";

export default {
  shape: drop,
  face: { eyeH: 1, eyeY: 0.5, mouth: "dot" },
} satisfies SpeciesArt;
