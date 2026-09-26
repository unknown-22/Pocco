// ゴミ山の王（おとな）: どっしりした洋なし型

import type { SpeciesArt } from "../body.ts";
import { pear } from "../shapes.ts";

export default {
  shape: pear,
  size: [2, 0],
  face: { mouth: "cat", eyeY: 0.45 },
} satisfies SpeciesArt;
