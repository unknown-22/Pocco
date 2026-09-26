import { describe, expect, it } from "vitest";
import { createRng, hashSeed, randInt } from "../src/rng.ts";

describe("rng", () => {
  it("同じシードからは同じ列が出る", () => {
    const a = createRng(hashSeed("pet1", 1000));
    const b = createRng(hashSeed("pet1", 1000));
    const seqA = Array.from({ length: 5 }, a);
    expect(Array.from({ length: 5 }, b)).toEqual(seqA);
  });

  it("シードが違えば別の列になる", () => {
    const a = createRng(hashSeed("pet1", 1000));
    const b = createRng(hashSeed("pet1", 1001));
    expect(a()).not.toEqual(b());
  });

  it("0 以上 1 未満、randInt は範囲内", () => {
    const rng = createRng(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const n = randInt(rng, -3, 3);
      expect(n).toBeGreaterThanOrEqual(-3);
      expect(n).toBeLessThanOrEqual(3);
    }
  });
});
