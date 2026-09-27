// ホーム画面のショートカット用のアイコン（PNG）を favicon.svg のドット絵から作る。
// favicon は 16×16 のマス目に h/v だけで描いた図形なので、マスの中心が図形の内側かどうかで塗る。
// まわりに余白を取り（24 マスの中央に 16 マス）、Android の丸などに切り抜かれても欠けないようにする。

import fs from "node:fs";
import zlib from "node:zlib";

export const BACKGROUND = "#fdf3e7"; // 画面の背景（ライト）と同じ
const GRID = 16;
const CANVAS = 24;

/** 作るアイコン（public/ 以下のファイル名 → 一辺のピクセル数） */
export const ICONS: Record<string, number> = {
  "icon-192.png": 192,
  "apple-touch-icon.png": 180,
};

type Point = [number, number];
type Rgba = [number, number, number, number];

function hex(color: string): Rgba {
  const n = parseInt(color.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

/** M/H/V/h/v/z だけのパスを多角形の集まりにする */
function parsePath(d: string): Point[][] {
  const polys: Point[][] = [];
  let cur: Point[] = [];
  let x = 0;
  let y = 0;
  for (const [, cmd, args] of d.matchAll(/([MmHhVvZz])([^MmHhVvZz]*)/g)) {
    const nums = args.trim() ? args.trim().split(/[\s,]+/).map(Number) : [];
    switch (cmd) {
      case "M":
      case "m":
        if (cur.length) polys.push(cur);
        x = cmd === "M" ? nums[0] : x + nums[0];
        y = cmd === "M" ? nums[1] : y + nums[1];
        cur = [[x, y]];
        break;
      case "H":
      case "h":
        for (const n of nums) cur.push([(x = cmd === "H" ? n : x + n), y]);
        break;
      case "V":
      case "v":
        for (const n of nums) cur.push([x, (y = cmd === "V" ? n : y + n)]);
        break;
      default:
        if (cur.length) polys.push(cur);
        cur = [];
    }
  }
  if (cur.length) polys.push(cur);
  return polys;
}

function inside(polys: Point[][], px: number, py: number): boolean {
  let hit = false;
  for (const poly of polys) {
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
    }
  }
  return hit;
}

/** favicon.svg を 16×16 のマス目（色 or null）にする */
export function pixelsFromSvg(svg: string): (Rgba | null)[][] {
  const grid: (Rgba | null)[][] = Array.from({ length: GRID }, () => Array(GRID).fill(null));
  for (const [, fill, d] of svg.matchAll(/<path fill="(#[0-9a-fA-F]{6})" d="([^"]+)"/g)) {
    const polys = parsePath(d);
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        if (inside(polys, gx + 0.5, gy + 0.5)) grid[gy][gx] = hex(fill);
      }
    }
  }
  return grid;
}

/** 一辺 size ピクセルの RGBA（背景つき・ドットは整数倍で拡大して中央に置く） */
export function renderIcon(grid: (Rgba | null)[][], size: number): Buffer {
  const cell = Math.floor(size / CANVAS);
  const offset = Math.floor((size - cell * GRID) / 2);
  const bg = hex(BACKGROUND);
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const gx = Math.floor((x - offset) / cell);
      const gy = Math.floor((y - offset) / cell);
      const c = x >= offset && y >= offset && gx < GRID && gy < GRID ? grid[gy][gx] : null;
      out.set(c ?? bg, (y * size + x) * 4);
    }
  }
  return out;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body));
  return Buffer.concat([len, body, crc]);
}

export function encodePng(rgba: Buffer, size: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 8 bit
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** PNG から RGBA を取り出す（テストで、置いてあるアイコンが favicon と合っているか確かめる用。フィルターなしのみ） */
export function decodePng(png: Buffer): { size: number; rgba: Buffer } {
  let pos = 8;
  let size = 0;
  const idat: Buffer[] = [];
  while (pos < png.length) {
    const len = png.readUInt32BE(pos);
    const type = png.toString("ascii", pos + 4, pos + 8);
    const data = png.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") size = data.readUInt32BE(0);
    if (type === "IDAT") idat.push(data);
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) raw.copy(rgba, y * size * 4, y * (size * 4 + 1) + 1, (y + 1) * (size * 4 + 1));
  return { size, rgba };
}

// node scripts/icons.ts で public/ にアイコンを書き出す
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  const pub = new URL("../public/", import.meta.url);
  const grid = pixelsFromSvg(fs.readFileSync(new URL("favicon.svg", pub), "utf8"));
  for (const [name, size] of Object.entries(ICONS)) {
    fs.writeFileSync(new URL(name, pub), encodePng(renderIcon(grid, size), size));
    console.log(`public/${name} (${size}×${size})`);
  }
}
