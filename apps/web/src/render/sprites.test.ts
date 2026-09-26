import { describe, expect, it } from "vitest";
import { BABY, EGG, KEEPSAKE, LITTER, NOTE, ZZZ, blink, type Sprite } from "./sprites.ts";
import { FEATURES, GLASSES, bodySprite } from "./body.ts";

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
