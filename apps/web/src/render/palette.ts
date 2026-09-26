// 固定パレット（仕様書 5.1）。黒は使わず、輪郭は色付きの暗色。
// 時間帯はパレット自体を差し替えて表現する。

import type { DayPeriod } from "../time.ts";

export const BASE = {
  // 部屋
  wall: "#f6e7d0",
  wallStripe: "#efdcc0",
  baseboard: "#d7b894",
  floor: "#dba97c",
  floorLine: "#c48f62",
  floorShade: "#b97f53",
  rug: "#f4a6b8",
  rugShade: "#e0849a",
  windowFrame: "#fdfaf4",
  windowFrameShade: "#d9c9b2",
  bed: "#8fc9e8",
  bedShade: "#679fc6",
  bedFrame: "#b98a64",
  pillow: "#fdfaf4",
  fridge: "#e6f0f1",
  fridgeShade: "#b8cdd1",
  fridgeHandle: "#8aa3a8",
  // ペット（ベビー）
  body: "#ffd166",
  bodyShade: "#f2a93f",
  bodyLine: "#c4722a",
  bodyLight: "#fff3c4",
  eye: "#4a3656",
  cheek: "#ff8fa3",
  // たまご
  shell: "#fff6e6",
  shellShade: "#ecd6b5",
  shellLine: "#c9a579",
  shellSpot: "#7fd1b9",
  // 散らかり
  paper: "#fdfaf4",
  paperShade: "#d9cfc0",
  toy: "#7fb8f0",
  toyLight: "#d4ecff",
  crumb: "#a8744a",
  // 種族の飾り（種族の色で上書きする）
  feature: "#7fcf8f",
  featureShade: "#5aa86b",
  glasses: "#6b5a4a",
  // 置き物
  note: "#fdfaf4",
  noteLine: "#c9b8a0",
  box: "#e8a0b4",
  boxShade: "#c77a92",
  boxRibbon: "#ffe28a",
  // 共通
  zzz: "#8f9df0",
  shadow: "#00000022",
} as const;

export type ColorKey = keyof typeof BASE;
export type Palette = Record<ColorKey, string>;

const SKY: Record<DayPeriod, { sky: string; skyLow: string }> = {
  morning: { sky: "#bfe3f7", skyLow: "#ffe1c4" },
  day: { sky: "#8fd3f4", skyLow: "#c9ecfb" },
  evening: { sky: "#f5a58c", skyLow: "#ffd39a" },
  night: { sky: "#2f3a78", skyLow: "#4b4f96" },
};

// 時間帯ごとに、部屋の色をどの色へどれだけ寄せるか
const TINT: Record<DayPeriod, { color: string; room: number; pet: number }> = {
  morning: { color: "#ffe6c7", room: 0.12, pet: 0.05 },
  day: { color: "#ffffff", room: 0, pet: 0 },
  evening: { color: "#ff9d6e", room: 0.2, pet: 0.1 },
  night: { color: "#3b3f9e", room: 0.38, pet: 0.12 },
};

const PET_KEYS = new Set<ColorKey>([
  "body", "bodyShade", "bodyLine", "bodyLight", "eye", "cheek", "feature", "featureShade", "glasses",
  "shell", "shellShade", "shellLine", "shellSpot",
]);

export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1, 7), 16);
  const pb = parseInt(b.slice(1, 7), 16);
  const ch = (shift: number) => {
    const ca = (pa >> shift) & 0xff;
    const cb = (pb >> shift) & 0xff;
    return Math.round(ca + (cb - ca) * t);
  };
  const hex = ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0");
  return `#${hex}${a.slice(7)}`;
}

const cache = new Map<DayPeriod, Palette & { sky: string; skyLow: string }>();

export function paletteFor(period: DayPeriod) {
  const hit = cache.get(period);
  if (hit) return hit;
  const tint = TINT[period];
  const out = {} as Palette;
  for (const key of Object.keys(BASE) as ColorKey[]) {
    const amount = PET_KEYS.has(key) ? tint.pet : tint.room;
    out[key] = key === "shadow" ? BASE[key] : mix(BASE[key], tint.color, amount);
  }
  const result = { ...out, ...SKY[period] };
  cache.set(period, result);
  return result;
}

/** 種族の色を、時間帯に合わせて色味を寄せたうえでパレットに重ねる */
export function withSpecies(
  base: ReturnType<typeof paletteFor>,
  period: DayPeriod,
  colors: { body: string; shade: string; line: string; light: string; cheek: string; feature: string },
  senior: boolean,
) {
  const tint = TINT[period];
  // シニアは少し白っぽくなる
  const age = (c: string) => (senior ? mix(c, "#ffffff", 0.3) : c);
  const t = (c: string) => mix(age(c), tint.color, tint.pet);
  return {
    ...base,
    body: t(colors.body),
    bodyShade: t(colors.shade),
    bodyLine: t(colors.line),
    bodyLight: t(colors.light),
    cheek: t(colors.cheek),
    feature: t(colors.feature),
    featureShade: t(mix(colors.feature, "#000000", 0.18)),
  };
}
