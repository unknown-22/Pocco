import type { Sprite } from "../render/sprites.ts";

export const SNACK: Sprite = {
  rows: ["..g..", ".rrr.", "rRrrr", "rrrrr", ".rrr."],
  colors: { g: "#5aa86b", r: "#e8736f", R: "#ffb8b0" },
};

export const PAPER: Sprite = {
  rows: [".pp.", "pPpp", "ppP.", ".pp."],
  colors: { p: "#fdfaf4", P: "#c9bfb0" },
};

export const NOTE_SPRITE: Sprite = {
  rows: ["..nn", "..nN", "..n.", "nnn.", "nnn."],
  colors: { n: "#9d7fd6", N: "#c9b6f0" },
};
