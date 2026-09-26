// 冷蔵庫の主（おとな）: 横に広い四角。冷蔵庫みたい

import type { SpeciesArt } from "../body.ts";
import { box } from "../shapes.ts";

export default {
  shape: box,
  size: [2, 1],
  face: { eyeY: 0.36 },
} satisfies SpeciesArt;
