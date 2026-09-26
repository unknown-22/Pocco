import { describe, expect, it } from "vitest";
import { stageForAge } from "../src/stage.ts";
import { createPet } from "../src/pet.ts";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

describe("stageForAge", () => {
  it.each([
    [0, "egg"],
    [59 * 60_000, "egg"],
    [1 * HOUR, "baby"],
    [1 * DAY, "child"],
    [3 * DAY, "teen"],
    [6 * DAY, "adult"],
    [11 * DAY, "senior"],
    [20 * DAY, "senior"],
  ] as const)("%d ms → %s", (age, stage) => {
    expect(stageForAge(age)).toBe(stage);
  });
});

describe("createPet", () => {
  it("同じ ID なら同じ性格で生まれる", () => {
    const a = createPet({ id: "x", name: "a", now: 0 });
    const b = createPet({ id: "x", name: "b", now: 999 });
    expect(a.state.personality).toEqual(b.state.personality);
    expect(a.state.stage).toBe("egg");
  });
});
