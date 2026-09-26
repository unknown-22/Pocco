import { describe, expect, it } from "vitest";
import { FLOORS, FURNITURE, SPECIES, WALLPAPERS, WEARABLES } from "@pocco/sim";
import { blink, type Sprite } from "./sprite.ts";
import * as A from "./assets/index.ts";

describe("素材のスプライト", () => {
  const all: [string, Sprite][] = [
    ["EGG", A.EGG],
    ["ZZZ", A.ZZZ],
    ["NOTE", A.NOTE],
    ["KEEPSAKE", A.KEEPSAKE],
    ["SPARKLE", A.SPARKLE],
    ["GLASSES", A.GLASSES],
    ["SNACK", A.SNACK],
    ["PAPER", A.PAPER],
    ["NOTE_SPRITE", A.NOTE_SPRITE],
    ...Object.entries(A.LITTER),
    ...Object.entries(A.FEATURES),
    ...Object.entries(A.FURNITURE_SPRITES),
    ...Object.entries(A.HAT_SPRITES),
    ...Object.entries(A.HAND_SPRITES),
    ...Object.entries(A.ACCESSORY_SPRITES).map(([k, v]): [string, Sprite] => [k, v.sprite]),
    ...["baby", "child", "teen", "adult"].map((st): [string, Sprite] => [`body:${st}`, A.bodySprite(st)]),
  ];
  it.each(all)("%s は全行が同じ幅で、未定義の文字がない", (_, sprite) => {
    const width = sprite.rows[0]!.length;
    for (const row of sprite.rows) {
      expect(row.length).toBe(width);
      for (const ch of row) {
        if (ch !== ".") expect(sprite.colors[ch]).toBeDefined();
      }
    }
  });

  it("まばたきで目が消える", () => {
    expect(blink(A.bodySprite("baby")).rows.join("")).not.toContain("e");
  });
});

describe("bodySprite", () => {
  it("段階が進むほど大きく、左右対称の目がある", () => {
    const widths = ["baby", "child", "teen", "adult"].map((st) => A.bodySprite(st).rows[0]!.length);
    expect([...widths].sort((a, b) => a - b)).toEqual(widths);
    const body = A.bodySprite("adult");
    const eyeRow = body.rows.find((r) => r.includes("e"))!;
    expect(eyeRow.indexOf("e") + eyeRow.lastIndexOf("e")).toBe(eyeRow.length - 1);
  });
});

// ファイルを足し忘れたり、ファイル名を打ちまちがえたりしていないか
describe("素材ファイルと sim の一覧が一致する", () => {
  const same = (files: Record<string, unknown>, ids: string[]) =>
    expect(Object.keys(files).sort()).toEqual([...new Set(ids)].sort());

  it("家具", () => same(A.FURNITURE_SPRITES, FURNITURE.map((f) => f.id)));
  it("着せ替え", () => {
    const of = (slot: string) => WEARABLES.filter((w) => w.slot === slot).map((w) => w.id);
    same(A.HAT_SPRITES, of("hat"));
    same(A.CLOTHES, of("clothes"));
    same(A.ACCESSORY_SPRITES, of("accessory"));
    same(A.HAND_SPRITES, of("hand"));
  });
  it("頭の飾り", () => same(A.FEATURES, SPECIES.map((s) => s.feature).filter((f) => f !== "none")));
  it("壁紙・床の模様", () => {
    same(A.WALLPAPER_PATTERNS, WALLPAPERS.map((w) => w.pattern));
    same(A.FLOOR_PATTERNS, FLOORS.map((f) => f.pattern));
  });
  it("部屋の固定の家具", () => same(A.ROOM_PARTS, ["window", "fridge", "bed", "rug"]));
  it("散らかり", () => same(A.LITTER, ["paper", "toy", "crumb"]));
});
