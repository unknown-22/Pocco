import { describe, expect, it } from "vitest";
import { BABY, EGG, blink } from "./sprites.ts";

describe("sprites", () => {
  it.each([["EGG", EGG], ["BABY", BABY]] as const)("%s は全行が同じ幅で、未定義の文字がない", (_, sprite) => {
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
