import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { ICONS, decodePng, pixelsFromSvg, renderIcon } from "../scripts/icons.ts";

const pub = new URL("../public/", import.meta.url);

describe("ホーム画面のショートカットのアイコン", () => {
  it("置いてある PNG が favicon.svg と同じ絵になっている（違ったら npm run icons -w @pocco/web）", () => {
    const grid = pixelsFromSvg(fs.readFileSync(new URL("favicon.svg", pub), "utf8"));
    for (const [name, size] of Object.entries(ICONS)) {
      const png = decodePng(fs.readFileSync(new URL(name, pub)));
      expect(png.size, name).toBe(size);
      expect(png.rgba.equals(renderIcon(grid, size)), name).toBe(true);
    }
  });

  it("favicon のドット絵を読み取れる", () => {
    const grid = pixelsFromSvg(fs.readFileSync(new URL("favicon.svg", pub), "utf8"));
    expect(grid[0][0]).toBeNull(); // 角は透明
    expect(grid[1][6]).toEqual([0xd8, 0xb8, 0x8a, 255]); // 輪郭
    expect(grid[5][7]).toEqual([0x7f, 0xd1, 0xb9, 255]); // 模様
    expect(grid[8][8]).toEqual([0xff, 0xf6, 0xe6, 255]); // 中身
  });

  it("index.html から参照するアイコンがすべてあり、PWA のマニフェストは置かない", () => {
    const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const pngs = [...html.matchAll(/href="\/([^"]+\.png)"/g)].map((m) => m[1]);
    expect(pngs.sort()).toEqual(Object.keys(ICONS).sort());
    expect(html).not.toContain('rel="manifest"');
    expect(fs.existsSync(new URL("manifest.webmanifest", pub))).toBe(false);
  });
});
