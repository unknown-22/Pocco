// 種族ごとの体（仮素材 D13）。楕円から輪郭・影・ハイライト・顔を自動で作る。
// 段階が進むほど大きくなる。頭の飾り（feature）は上に重ねる。

import type { Feature } from "@pocco/sim";
import type { Sprite } from "./sprites.ts";

const SIZE: Record<string, [number, number]> = {
  baby: [16, 14],
  child: [18, 16],
  teen: [20, 17],
  adult: [22, 19],
  senior: [22, 19],
  final_day: [22, 19],
};

const cache = new Map<string, Sprite>();

/** 体のスプライト。色の記号: o=輪郭 B=体 b=影 h=ハイライト e=目 c=ほお */
export function bodySprite(stage: string): Sprite {
  const hit = cache.get(stage);
  if (hit) return hit;
  const [w, h] = SIZE[stage] ?? SIZE.baby!;
  const inside = (x: number, y: number) => {
    const nx = (x + 0.5 - w / 2) / (w / 2);
    const ny = (y + 0.5 - h / 2) / (h / 2);
    // 下が少し平たい、おまんじゅう型
    return nx * nx + (ny > 0 ? ny * ny * 1.15 : ny * ny) <= 1;
  };
  const grid: string[][] = [];
  for (let y = 0; y < h; y++) {
    const row: string[] = [];
    for (let x = 0; x < w; x++) {
      if (!inside(x, y)) {
        row.push(".");
      } else if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) {
        row.push("o");
      } else if (y >= h * 0.72 || x >= w * 0.84) {
        row.push("b");
      } else if (y <= h * 0.25 && x <= w * 0.4) {
        row.push("h");
      } else {
        row.push("B");
      }
    }
    grid.push(row);
  }
  // 顔
  const eyeY = Math.round(h * 0.4);
  const lx = Math.round(w * 0.3);
  const rx = w - 1 - lx;
  for (const x of [lx, rx]) {
    grid[eyeY]![x] = "e";
    grid[eyeY + 1]![x] = "e";
  }
  grid[eyeY + 2]![lx - 1] = "c";
  grid[eyeY + 2]![rx + 1] = "c";
  const mid = Math.floor(w / 2);
  grid[eyeY + 3]![mid - 1] = "o";
  grid[eyeY + 3]![mid] = "o";

  const sprite: Sprite = {
    rows: grid.map((r) => r.join("")),
    colors: { o: "bodyLine", B: "body", b: "bodyShade", h: "bodyLight", e: "eye", c: "cheek" },
  };
  cache.set(stage, sprite);
  return sprite;
}

/** 頭の飾り。anchorY は飾りの一番下の行が体の一番上の行に重なる位置 */
export const FEATURES: Record<Exclude<Feature, "none">, Sprite> = {
  sprout: { rows: ["f.f", ".f.", ".F."], colors: { f: "feature", F: "featureShade" } },
  ears: { rows: ["o.......o", "ff.....ff", "fF.....Ff"], colors: { f: "feature", F: "featureShade", o: "bodyLine" } },
  bunny: { rows: [".f...f.", "fF...Ff", "fF...Ff", "fF...Ff", ".f...f."], colors: { f: "feature", F: "featureShade" } },
  antenna: { rows: ["F...F", ".f.f.", ".f.f."], colors: { f: "bodyLine", F: "feature" } },
  horn: { rows: [".f.", ".f.", "fFf"], colors: { f: "feature", F: "featureShade" } },
  crown: { rows: ["f.f.f", "fffff", "FFFFF"], colors: { f: "feature", F: "featureShade" } },
  nightcap: { rows: ["....fF", "...ff.", "..fff.", ".ffff.", "FFFFFF"], colors: { f: "feature", F: "featureShade" } },
  tuft: { rows: ["f.f", "fff"], colors: { f: "feature" } },
  bow: { rows: ["ff.ff", "fFFFf", "ff.ff"], colors: { f: "feature", F: "featureShade" } },
  leaf: { rows: ["..ff", ".fFf", "fFf.", ".f.."], colors: { f: "feature", F: "featureShade" } },
  star: { rows: ["..f..", "fffff", ".fFf.", "f...f"], colors: { f: "feature", F: "featureShade" } },
};

/** シニアの眼鏡。目の高さに重ねる */
export const GLASSES: Sprite = { rows: ["ggg....ggg", "g.gggggg.g", "ggg....ggg"], colors: { g: "glasses" } };
