// たまご

import type { Sprite } from "../../sprite.ts";

export default {
  rows: [
    "....oooo....",
    "..oohSSSoo..",
    ".ohhSSSSSSo.",
    ".ohSSSggSSo.",
    "ohSSSSggSSSo",
    "oSSSSSSSSSSo",
    "oSggSSSSSSSo",
    "oSggSSSSSgSo",
    "oSSSSSSSggSo",
    "oSSSSSSSSSso",
    "osSSSSSSSSso",
    ".osSSSSSSso.",
    "..osssssso..",
    "....oooo....",
  ],
  colors: { o: "shellLine", S: "shell", s: "shellShade", g: "shellSpot", h: "shell" },
} satisfies Sprite;
