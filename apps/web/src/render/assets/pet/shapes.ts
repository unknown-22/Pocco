// 体の形の部品（species/ から使う）。体の中心を 0、端を ±1 とした座標で、内側なら true。

/** おまんじゅう型（下が少し平たい）。ふつうの体 */
export function manju(nx: number, ny: number) {
  return nx * nx + (ny > 0 ? ny * ny * 1.15 : ny * ny) <= 1;
}

/** しずく型（上がとがる） */
export function drop(nx: number, ny: number) {
  if (ny >= 0) return nx * nx + ny * ny * 1.15 <= 1;
  const half = Math.sqrt(Math.max(0, 1 - ny * ny)) * (1 + ny * 0.45);
  return Math.abs(nx) <= half;
}

/** 洋なし型（下がふくらむ） */
export function pear(nx: number, ny: number) {
  if (ny >= 0) return nx * nx + ny * ny * 1.15 <= 1;
  const half = Math.sqrt(Math.max(0, 1 - ny * ny)) * (0.78 + 0.22 * (1 + ny));
  return Math.abs(nx) <= half;
}

/** 角の丸い四角 */
export function box(nx: number, ny: number) {
  return nx ** 4 + ny ** 4 <= 1;
}

/** おもち型（上が平たく、ぺったり） */
export function mochi(nx: number, ny: number) {
  return ny < -0.2 ? nx * nx + ((ny + 0.2) / 0.8) ** 2 <= 1 : Math.abs(nx) ** 3 + Math.abs(ny) ** 3 * 0.9 <= 1;
}
