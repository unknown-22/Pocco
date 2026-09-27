import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { ICONS, decodePng, pixelsFromSvg, renderIcon } from "../scripts/icons.ts";

const pub = new URL("../public/", import.meta.url);

describe("ホーム画面のアイコン", () => {
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

  it("マニフェストのアイコンがすべてある", () => {
    const manifest = JSON.parse(fs.readFileSync(new URL("manifest.webmanifest", pub), "utf8"));
    expect(manifest.display).toBe("standalone");
    for (const icon of manifest.icons) {
      expect(fs.existsSync(new URL(icon.src.slice(1), pub)), icon.src).toBe(true);
      expect(ICONS[icon.src.slice(1)]).toBe(Number(icon.sizes.split("x")[0]));
    }
  });
});
