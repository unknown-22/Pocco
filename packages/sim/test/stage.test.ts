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
    [13 * DAY, "final_day"],
    [14 * DAY, "departed"],
  ] as const)("%d ms → %s", (age, stage) => {
    expect(stageForAge(age)).toBe(stage);
  });
});

describe("寿命の前後", () => {
  it("寿命が延びるとシニア以降の境目も後ろにずれる", () => {
    expect(stageForAge(11 * DAY, 6)).toBe("adult");
    expect(stageForAge(14 * DAY, 6)).toBe("final_day");
    expect(stageForAge(14 * DAY - 5 * HOUR, -6)).toBe("departed");
  });
  it("前後は ±12 時間まで", () => {
    expect(stageForAge(14 * DAY + 13 * HOUR, 100)).toBe("departed");
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
