import { describe, expect, it } from "vitest";
import { inSleepWindow, sleepSchedule } from "../src/personality.ts";
import { createPet } from "../src/pet.ts";

const personality = { ...createPet({ id: "sleep", name: "ポッコ", now: 0 }).state.personality, chronotype: 0 };

describe("設定した就寝時刻", () => {
  it("既定では 23:00〜7:00", () => {
    expect(sleepSchedule(personality)).toEqual({ bedtime: 23, wake: 7 });
    expect(inSleepWindow(23, personality)).toBe(true);
    expect(inSleepWindow(7, personality)).toBe(false);
  });
  it("昼間の睡眠と分単位の指定にも対応する", () => {
    expect(sleepSchedule(personality, 8 * 60 + 30)).toEqual({ bedtime: 8.5, wake: 16.5 });
    expect(inSleepWindow(8.4, personality, 510)).toBe(false);
    expect(inSleepWindow(8.5, personality, 510)).toBe(true);
    expect(inSleepWindow(16.5, personality, 510)).toBe(false);
  });
  it("日付をまたぐ朝型・夜型の補正も正しく判定する", () => {
    expect(sleepSchedule({ ...personality, chronotype: -100 }, 30)).toEqual({ bedtime: 22.5, wake: 6.5 });
    expect(inSleepWindow(0, { ...personality, chronotype: -100 }, 30)).toBe(true);
    expect(sleepSchedule({ ...personality, chronotype: 100 }, 1380)).toEqual({ bedtime: 1, wake: 9 });
    expect(inSleepWindow(0, { ...personality, chronotype: 100 }, 1380)).toBe(false);
  });
});
