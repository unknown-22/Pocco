// ドット絵の基本（仕様書 5.2・D13）。素材はコードで描き、1 つずつ assets/ の個別ファイルに置く。
// スプライトは文字 1 つが 1 ドット。"." は透明。

import type { ColorKey } from "./palette.ts";

export interface Sprite {
  rows: string[];
  /** パレットのキー、または直接の色（"#rrggbb"。時間帯の色味は p.hex で寄せる） */
  colors: Record<string, ColorKey | `#${string}`>;
}

export type DrawPalette = Record<ColorKey, string> & { hex?: (c: string) => string };

/** 部屋の描画に使うパレット（空の色と、直接の色を時間帯に寄せる hex つき） */
export type RoomPalette = Record<ColorKey, string> & { sky: string; skyLow: string; hex: (c: string) => string };

/** 四角をひとつ塗る */
export type Fill = (x: number, y: number, w: number, h: number, color: string) => void;

/** アクセサリ。anchor は置く場所 */
export interface AccessoryArt {
  sprite: Sprite;
  anchor: "headRight" | "eyes" | "mouth" | "headLeft";
}

/** 服。体の下のほう（from〜to の割合の行）の色を塗りかえる */
export interface ClothesArt {
  from: number;
  to: number;
  color: `#${string}`;
  shade: `#${string}`;
  stripe?: `#${string}`;
}

/** 壁紙・床の模様。base で塗ったあとに accent で模様を描く */
export type PatternArt = (fill: Fill, accent: string) => void;

/** 部屋の固定の家具（窓・冷蔵庫・ベッド・ラグ） */
export type RoomPartArt = (fill: Fill, p: RoomPalette, night: boolean) => void;

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
  palette: DrawPalette,
) {
  sprite.rows.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      const key = sprite.colors[row[dx]!];
      if (!key) continue;
      ctx.fillStyle = key.startsWith("#") ? (palette.hex ? palette.hex(key) : key) : palette[key as ColorKey];
      ctx.fillRect(x + dx, y + dy, 1, 1);
    }
  });
}
