import { describe, expect, it } from "vitest";
import { BABY, EGG, KEEPSAKE, LITTER, NOTE, ZZZ, blink, type Sprite } from "./sprites.ts";
import { FEATURES, GLASSES, bodySprite } from "./body.ts";
import { FURNITURE_SPRITES, HAT_SPRITES, ACCESSORY_SPRITES, HAND_SPRITES, CLOTHES } from "./decor.ts";
import { FURNITURE, WEARABLES } from "@pocco/sim";

describe("sprites", () => {
  const all: [string, Sprite][] = [
    ["EGG", EGG],
    ["BABY", BABY],
    ["ZZZ", ZZZ],
    ["NOTE", NOTE],
    ["KEEPSAKE", KEEPSAKE],
    ["GLASSES", GLASSES],
    ...Object.entries(LITTER),
    ...Object.entries(FEATURES),
    ...Object.entries(FURNITURE_SPRITES),
    ...Object.entries(HAT_SPRITES),
    ...Object.entries(HAND_SPRITES),
    ...Object.entries(ACCESSORY_SPRITES).map(([k, v]): [string, Sprite] => [k, v.sprite]),
    ...["baby", "child", "teen", "adult"].map((st): [string, Sprite] => [`body:${st}`, bodySprite(st)]),
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
    expect(blink(BABY).rows.join("")).not.toContain("e");
  });
});

describe("bodySprite", () => {
  it("段階が進むほど大きく、左右対称の目がある", () => {
    const widths = ["baby", "child", "teen", "adult"].map((st) => bodySprite(st).rows[0]!.length);
    expect([...widths].sort((a, b) => a - b)).toEqual(widths);
    const body = bodySprite("adult");
    const eyeRow = body.rows.find((r) => r.includes("e"))!;
    expect(eyeRow.indexOf("e") + eyeRow.lastIndexOf("e")).toBe(eyeRow.length - 1);
  });
});

describe("家具・着せ替えの絵", () => {
  it("すべての家具に絵がある", () => {
    for (const f of FURNITURE) expect(FURNITURE_SPRITES[f.id], f.id).toBeDefined();
  });
  it("すべての着せ替えに絵がある", () => {
    for (const w of WEARABLES) {
      const table = { hat: HAT_SPRITES, clothes: CLOTHES, accessory: ACCESSORY_SPRITES, hand: HAND_SPRITES }[w.slot];
      expect((table as Record<string, unknown>)[w.id], w.id).toBeDefined();
    }
  });
});
