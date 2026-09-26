// 家具と着せ替えのドット絵（仮素材 D13）。色は直接指定し、時間帯の色味は p.hex で寄せる。

import type { Sprite } from "./sprites.ts";

const C = <T extends Record<string, `#${string}`>>(c: T) => c;

export const FURNITURE_SPRITES: Record<string, Sprite> = {
  plant_pot: {
    rows: [
      "...gg.....",
      "..gGg.gg..",
      ".gGg.gGGg.",
      "..gGgGgg..",
      "...gGGg...",
      "....Gg....",
      "..tttttt..",
      "..tTTTTt..",
      "...tTTt...",
      "...tttt...",
    ],
    colors: C({ g: "#7fcf8f", G: "#4f9e62", t: "#d98a5f", T: "#c06f45" }),
  },
  bookshelf: {
    rows: [
      "wwwwwwwwwwwwww",
      "wrrbbyyggrbbyw",
      "wrrbbyyggrbbyw",
      "wrrbbyyggrbbyw",
      "wwwwwwwwwwwwww",
      "wgyyrrbbggyrrw",
      "wgyyrrbbggyrrw",
      "wgyyrrbbggyrrw",
      "wwwwwwwwwwwwww",
      "wbbgg...yyrr.w",
      "wbbgg...yyrr.w",
      "wwwwwwwwwwwwww",
      "WW..........WW",
    ],
    colors: C({ w: "#b98a64", W: "#8f6444", r: "#e8736f", b: "#6f9fe0", y: "#f2c75c", g: "#7fc58e" }),
  },
  telescope: {
    rows: [
      "..........tt",
      "........tttT",
      "......tttTT.",
      "....tttTT...",
      "...ttTT.....",
      "....l.......",
      "...lll......",
      "..l.l.l.....",
      ".l..l..l....",
      "l...l...l...",
    ],
    colors: C({ t: "#6f7fb8", T: "#4f5d96", l: "#8f6444" }),
  },
  radio: {
    rows: [
      "......a.....",
      ".....a......",
      "rrrrrrrrrrrr",
      "rsssssrkkkkr",
      "rs.s.srkKKkr",
      "rsssssrkkkkr",
      "rs.s.srk..kr",
      "rrrrrrrrrrrr",
      ".d........d.",
    ],
    colors: C({ r: "#e8736f", s: "#fdfaf4", k: "#4a3656", K: "#f2c75c", a: "#8f8f9f", d: "#8f6444" }),
  },
  cushion: {
    rows: [
      "....cccccc......",
      "..ccCCCCCCcc....",
      ".cCCCCCCCCCCcc..",
      "cCCCCCCCCCCCCCc.",
      "cCCCCCCCCCCCCCCc",
      "cCCCCCCCCCCCCCCc",
      ".cccccccccccccc.",
    ],
    colors: C({ c: "#e39bc3", C: "#f7c6e0" }),
  },
  painting: {
    rows: [
      "ffffffffffff",
      "fsssssssssyf",
      "fsssssssssyf",
      "fssssmsssssf",
      "fsssmmmssssf",
      "fssmmmmmgggf",
      "fgggmmmggggf",
      "fggggggggggf",
      "ffffffffffff",
    ],
    colors: C({ f: "#c9a26b", s: "#bfe3f7", y: "#ffe28a", m: "#8fa3c9", g: "#8fd08f" }),
  },
  clock: {
    rows: [
      "..cccccc..",
      ".cwwwwwwc.",
      "cwwwwkwwwc",
      "cwwwwkwwwc",
      "cwwwwkkkwc",
      "cwwwwwwwwc",
      ".cwwwwwwc.",
      "..cccccc..",
      "....pp....",
      "....PP....",
    ],
    colors: C({ c: "#b98a64", w: "#fdfaf4", k: "#4a3656", p: "#f2c75c", P: "#d9a93f" }),
  },
  collection_shelf: {
    rows: [
      ".r..b..y..g..r.",
      "rRr.bB.yY.gG.rR",
      "wwwwwwwwwwwwwww",
      ".W...........W.",
    ],
    colors: C({ w: "#b98a64", W: "#8f6444", r: "#e8736f", R: "#c95550", b: "#6f9fe0", B: "#4f7fc0", y: "#f2c75c", Y: "#d9a93f", g: "#7fc58e", G: "#5aa86b" }),
  },
  garland: {
    rows: [
      "ssssssssssssssssssssssss",
      "rrr.yyy.bbb.ggg.rrr.yyy.",
      ".r...y...b...g...r...y..",
    ],
    colors: C({ s: "#8f6444", r: "#e8736f", y: "#f2c75c", b: "#6f9fe0", g: "#7fc58e" }),
  },
};

/** 帽子。頭のてっぺんに、下の行が 1 行重なるように置く */
export const HAT_SPRITES: Record<string, Sprite> = {
  straw_hat: {
    rows: ["...ssssss...", "..sSSSSSSs..", "..srrrrrrs..", "ssssssssssss"],
    colors: C({ s: "#f2d28a", S: "#e5bd66", r: "#e8736f" }),
  },
  beret: {
    rows: [".....b....", "..bbbbbb..", ".bBbbbbbbb", "bbbbbbbbb."],
    colors: C({ b: "#c95550", B: "#e8736f" }),
  },
  knit_cap: {
    rows: ["....pp....", "...pppp...", "..kkkkkk..", ".kKkKkKkk.", "kkkkkkkkkk", "wwwwwwwwww"],
    colors: C({ p: "#fdfaf4", k: "#7fb8f0", K: "#5a96d6", w: "#d4ecff" }),
  },
  party_hat: {
    rows: ["...y...", "...p...", "..ppb..", "..bbp..", ".ppbbp.", ".bbppb.", "ppbbppb"],
    colors: C({ y: "#ffe28a", p: "#ff8fa3", b: "#8fd3f4" }),
  },
  crown_gold: {
    rows: ["g..r..g", "g..g..g", "gg.g.gg", "ggggggg", "GGGGGGG"],
    colors: C({ g: "#ffd24d", G: "#e0a820", r: "#e8736f" }),
  },
};

/** 服。体の下のほう（from〜to の割合の行）の色を塗りかえる */
export const CLOTHES: Record<string, { from: number; to: number; color: `#${string}`; shade: `#${string}`; stripe?: `#${string}` }> = {
  scarf_red: { from: 0.55, to: 0.68, color: "#e8736f", shade: "#c95550" },
  overalls: { from: 0.62, to: 1, color: "#6f9fe0", shade: "#4f7fc0" },
  cape: { from: 0.5, to: 1, color: "#9d7fd6", shade: "#7c5fb8" },
  raincoat: { from: 0.55, to: 1, color: "#ffd24d", shade: "#e0a820", stripe: "#f5b82e" },
};

/** アクセサリ。anchor は置く場所 */
export const ACCESSORY_SPRITES: Record<string, { sprite: Sprite; anchor: "headRight" | "eyes" | "mouth" | "headLeft" }> = {
  ribbon: { sprite: { rows: ["rr.rr", "rRRRr", "rr.rr"], colors: C({ r: "#ff8fa3", R: "#e0607a" }) }, anchor: "headRight" },
  round_glasses: {
    sprite: { rows: [".ggg...ggg.", "g...ggg...g", ".ggg...ggg."], colors: C({ g: "#4a3656" }) },
    anchor: "eyes",
  },
  mustache: { sprite: { rows: ["mm..mm", ".mmmm."], colors: C({ m: "#6b4a3a" }) }, anchor: "mouth" },
  flower: { sprite: { rows: [".p.", "pyp", ".p."], colors: C({ p: "#ffffff", y: "#ffd24d" }) }, anchor: "headLeft" },
};

/** 手に持つ物。体の右横、中くらいの高さに置く（下の行が持つところ） */
export const HAND_SPRITES: Record<string, Sprite> = {
  balloon: {
    rows: [".rrr.", "rRrrr", "rrrrr", ".rrr.", "..s..", "..s..", ".s...", ".s...", "..s.."],
    colors: C({ r: "#e8736f", R: "#ffb8b0", s: "#8f8f9f" }),
  },
  flag: {
    rows: ["pfff", "pfFf", "pfff", "p...", "p...", "p..."],
    colors: C({ p: "#8f6444", f: "#e8736f", F: "#ffffff" }),
  },
  lollipop: {
    rows: [".ppp.", "pwpwp", ".ppp.", "..s..", "..s.."],
    colors: C({ p: "#ff8fa3", w: "#ffffff", s: "#fdfaf4" }),
  },
};
