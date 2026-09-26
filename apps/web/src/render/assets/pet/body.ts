// ペットの体。種族ごとの形（species/）から輪郭・影・ハイライト・顔を自動で作る。
// 段階が進むほど大きくなる。頭の飾り（features/）は上に重ねる。
// 目・口・つぶれ具合は動き（poses/）ごとに変える。

import type { Sprite } from "../../sprite.ts";
import { manju } from "./shapes.ts";

/** 形の関数。体の中心を 0、端を ±1 とした座標（y は下向き）が体の内側なら true */
export type Shape = (nx: number, ny: number) => boolean;

export interface FaceArt {
  /** 目の横の位置（体の幅に対する割合。左目の位置） */
  eyeX?: number;
  /** 目の高さ（体の高さに対する割合） */
  eyeY?: number;
  /** 目の縦の大きさ */
  eyeH?: 1 | 2;
  /** ふだんの口 */
  mouth?: "line" | "smile" | "cat" | "dot";
  /** ほっぺ */
  cheeks?: boolean;
}

/** 種族の見た目（species/<種族ID>.ts）。書かなかった項目はふつうの体になる */
export interface SpeciesArt {
  shape?: Shape;
  /** 段階ごとの大きさに足す [幅, 高さ] */
  size?: [number, number];
  face?: FaceArt;
  /** 手描きの体（段階ごと）。あればそちらを使う（目は e、閉じ目はまばたきで作る） */
  sprites?: Partial<Record<string, Sprite>>;
}

export type Eyes = "open" | "closed" | "happy" | "angry";
export type Mouth = "normal" | "open" | "smile" | "frown";

export interface BodyOptions {
  eyes?: Eyes;
  mouth?: Mouth;
  /** 体の下のほうを何行つぶすか（息をする・寝ている・着地したとき） */
  squash?: number;
}

const SIZE: Record<string, [number, number]> = {
  baby: [16, 14],
  child: [18, 16],
  teen: [20, 17],
  adult: [22, 19],
  senior: [22, 19],
  final_day: [22, 19],
};

const cache = new Map<string, Sprite>();
const COLORS: Sprite["colors"] = { o: "bodyLine", B: "body", b: "bodyShade", h: "bodyLight", e: "eye", c: "cheek", m: "eye" };

/** 体のスプライト。色の記号: o=輪郭 B=体 b=影 h=ハイライト e=目 c=ほお m=口の中 */
export function bodySprite(stage: string, art: SpeciesArt = {}, opts: BodyOptions = {}): Sprite {
  const drawn = art.sprites?.[stage];
  if (drawn) return drawn;
  const key = JSON.stringify([stage, art.shape?.name, art.size, art.face, opts]);
  const hit = cache.get(key);
  if (hit) return hit;

  const [bw, bh] = SIZE[stage] ?? SIZE.baby!;
  const w = bw + (art.size?.[0] ?? 0);
  const h = bh + (art.size?.[1] ?? 0);
  const shape = art.shape ?? manju;
  const inside = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && shape((x + 0.5 - w / 2) / (w / 2), (y + 0.5 - h / 2) / (h / 2));

  const grid: string[][] = [];
  for (let y = 0; y < h; y++) {
    const row: string[] = [];
    for (let x = 0; x < w; x++) {
      if (!inside(x, y)) row.push(".");
      else if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) row.push("o");
      else if (y >= h * 0.72 || x >= w * 0.84) row.push("b");
      else if (y <= h * 0.25 && x <= w * 0.4) row.push("h");
      else row.push("B");
    }
    grid.push(row);
  }

  drawFace(grid, w, h, art.face ?? {}, opts);

  // つぶす: 顔より下の影の行を抜く（上がそのぶん下がる）
  const squash = Math.min(opts.squash ?? 0, 3);
  for (let i = 0; i < squash; i++) grid.splice(Math.round(h * 0.8), 1);

  const sprite: Sprite = { rows: grid.map((r) => r.join("")), colors: COLORS };
  cache.set(key, sprite);
  return sprite;
}

function drawFace(grid: string[][], w: number, h: number, face: FaceArt, opts: BodyOptions) {
  const set = (x: number, y: number, ch: string) => {
    if (grid[y]?.[x] !== undefined && grid[y]![x] !== ".") grid[y]![x] = ch;
  };
  const eyeY = Math.round(h * (face.eyeY ?? 0.4));
  const eyeH = face.eyeH ?? 2;
  const lx = Math.round(w * (face.eyeX ?? 0.3));
  const rx = w - 1 - lx;
  const eyes = opts.eyes ?? "open";

  for (const [x, dir] of [[lx, 1], [rx, -1]] as const) {
    switch (eyes) {
      case "open":
      case "angry":
        for (let i = 0; i < eyeH; i++) set(x, eyeY + i, "e");
        if (eyes === "angry") {
          // つり上がった眉
          set(x - dir, eyeY - 2, "o");
          set(x, eyeY - 1, "o");
        }
        break;
      case "closed":
        set(x - 1, eyeY + eyeH - 1, "o");
        set(x, eyeY + eyeH - 1, "o");
        set(x + 1, eyeY + eyeH - 1, "o");
        break;
      case "happy":
        // ^ ^
        set(x, eyeY, "e");
        set(x - 1, eyeY + 1, "e");
        set(x + 1, eyeY + 1, "e");
        break;
    }
  }

  const cy = eyeY + eyeH;
  if (face.cheeks !== false) {
    set(lx - 1, cy, "c");
    set(rx + 1, cy, "c");
  }

  const my = cy + 1;
  const mid = Math.floor(w / 2);
  const mouth = opts.mouth ?? "normal";
  if (mouth === "open") {
    set(mid - 1, my, "o");
    set(mid, my, "o");
    set(mid - 1, my + 1, "m");
    set(mid, my + 1, "m");
    set(mid - 2, my + 1, "o");
    set(mid + 1, my + 1, "o");
    set(mid - 1, my + 2, "o");
    set(mid, my + 2, "o");
    return;
  }
  const style = mouth === "smile" ? "smile" : mouth === "frown" ? "frown" : (face.mouth ?? "line");
  switch (style) {
    case "line":
      set(mid - 1, my, "o");
      set(mid, my, "o");
      break;
    case "dot":
      set(mid - (w % 2 === 0 ? 1 : 0), my, "o");
      break;
    case "smile":
      set(mid - 2, my, "o");
      set(mid + 1, my, "o");
      set(mid - 1, my + 1, "o");
      set(mid, my + 1, "o");
      break;
    case "frown":
      set(mid - 1, my, "o");
      set(mid, my, "o");
      set(mid - 2, my + 1, "o");
      set(mid + 1, my + 1, "o");
      break;
    case "cat":
      // ω
      set(mid - 2, my, "o");
      set(mid - 1, my + 1, "o");
      set(mid, my, "o");
      set(mid + 1, my + 1, "o");
      set(mid + 2, my, "o");
      break;
  }
}
