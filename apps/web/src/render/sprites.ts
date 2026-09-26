// 仮のドット絵スプライト（仕様書 D13: 本番素材は P6 で差し替える）。
// 文字 1 つが 1 ドット。"." は透明。

import type { ColorKey } from "./palette.ts";

export interface Sprite {
  rows: string[];
  colors: Record<string, ColorKey>;
}

export const EGG: Sprite = {
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
};

export const BABY: Sprite = {
  rows: [
    ".....oooooo.....",
    "...oohhBBBBoo...",
    "..ohhBBBBBBBBo..",
    ".ohBBBBBBBBBBBo.",
    ".oBBBBBBBBBBBBo.",
    "oBBBeBBBBBBeBBBo",
    "oBBBeBBBBBBeBBBo",
    "oBBcBBBBBBBBcBBo",
    "oBBBBBBooBBBBBBo",
    "oBBBBBBBBBBBBBbo",
    "obBBBBBBBBBBBbbo",
    ".obbBBBBBBBBbbo.",
    "..obbbbbbbbbbo..",
    "...oooooooooo...",
  ],
  colors: { o: "bodyLine", B: "body", b: "bodyShade", h: "bodyLight", e: "eye", c: "cheek" },
};

/** まばたき: 目の上段を体の色、下段を線にする。 */
export function blink(sprite: Sprite): Sprite {
  let seen = 0;
  const rows = sprite.rows.map((row) => {
    if (!row.includes("e")) return row;
    seen++;
    return row.replaceAll("e", seen === 1 ? "B" : "o");
  });
  return { ...sprite, rows };
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  x: number,
  y: number,
  palette: Record<ColorKey, string>,
) {
  sprite.rows.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      const key = sprite.colors[row[dx]!];
      if (!key) continue;
      ctx.fillStyle = palette[key];
      ctx.fillRect(x + dx, y + dy, 1, 1);
    }
  });
}

// 散らかり（仕様書 6.2）
export const LITTER: Record<string, Sprite> = {
  paper: {
    rows: [".pp.", "pPpp", "ppP.", ".pp."],
    colors: { p: "paper", P: "paperShade" },
  },
  toy: {
    rows: [".tt.", "tTtt", "tttt", ".tt."],
    colors: { t: "toy", T: "toyLight" },
  },
  crumb: {
    rows: ["c..c", ".c..", "..cc"],
    colors: { c: "crumb" },
  },
};

export const ZZZ: Sprite = {
  rows: ["zzz", "..z", ".z.", "z..", "zzz"],
  colors: { z: "zzz" },
};

/** 散歩中の書き置き */
export const NOTE: Sprite = {
  rows: ["nnnnnn", "nlllln", "nnnnnn", "nllnnn", "nnnnnn"],
  colors: { n: "note", l: "noteLine" },
};

/** 窓ぎわの形見（小さな箱） */
export const KEEPSAKE: Sprite = {
  rows: ["..rr..", "bbrrbb", "bBrrBb", "bBrrBb", "bbbbbb"],
  colors: { b: "box", B: "boxShade", r: "boxRibbon" },
};
