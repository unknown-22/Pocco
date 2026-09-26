import { describe, expect, it } from "vitest";
import { CATCH, caught, catchSpawns, hideRounds, itemY, judgeTap, rhythmBeats, rhythmScore, RHYTHM } from "./logic.ts";

describe("キャッチ", () => {
  it("同じシードなら同じ落ち方。やんちゃな子ほど数が多い", () => {
    expect(catchSpawns(1, 1)).toEqual(catchSpawns(1, 1));
    expect(catchSpawns(1, 1.3).length).toBeGreaterThan(catchSpawns(1, 0.8).length);
    for (const it of catchSpawns(2, 1)) {
      expect(it.x).toBeGreaterThanOrEqual(CATCH.fieldMin);
      expect(it.x).toBeLessThanOrEqual(CATCH.fieldMax);
      expect(it.at).toBeLessThan(CATCH.durationMs);
    }
  });

  it("受け止める判定", () => {
    expect(caught(50, CATCH.playerY - 2, 55)).toBe(true);
    expect(caught(50, CATCH.playerY - 2, 70)).toBe(false);
    expect(caught(50, 40, 50)).toBe(false);
  });

  it("出てきてから時間とともに落ちる", () => {
    const item = { id: 0, at: 1000, x: 50, kind: "snack" as const };
    expect(itemY(item, 1000, 1)).toBeLessThan(0);
    expect(itemY(item, 3500, 1)).toBeGreaterThan(CATCH.playerY);
  });

  it("全部受け止めれば成功ラインに届く", () => {
    const snacks = catchSpawns(3, 1).filter((i) => i.kind === "snack");
    expect(snacks.length).toBeGreaterThanOrEqual(CATCH.successAt);
  });
});

describe("かくれんぼ", () => {
  it("のんびり屋は寝てしまうことがある", () => {
    const sleepy = Array.from({ length: 20 }, (_, i) => hideRounds(i, { sleepy: 0.4, peek: 0 })).flat();
    expect(sleepy.some((r) => r.asleep)).toBe(true);
    const awake = Array.from({ length: 20 }, (_, i) => hideRounds(i, { sleepy: 0, peek: 0 })).flat();
    expect(awake.some((r) => r.asleep)).toBe(false);
  });
});

describe("リズムタップ", () => {
  it("きちょうめんな子は一定のテンポ", () => {
    const beats = rhythmBeats(1, true, 1);
    const gaps = beats.slice(1).map((b, i) => b - beats[i]!);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(1);
    expect(beats).toHaveLength(RHYTHM.beats);
  });

  it("タイミングで判定し、同じ拍は 2 回判定しない", () => {
    const beats = [1000, 1600, 2200];
    const judged: ("good" | "ok" | "miss" | null)[] = [null, null, null];
    const a = judgeTap(beats, judged, 1050)!;
    expect(a).toEqual({ index: 0, grade: "good" });
    judged[a.index] = a.grade;
    expect(judgeTap(beats, judged, 1060)).toBeNull(); // 次の拍までは遠すぎる
    const b = judgeTap(beats, judged, 1560)!;
    expect(b).toEqual({ index: 1, grade: "good" });
    judged[b.index] = b.grade;
    expect(judgeTap(beats, judged, 2350)!.grade).toBe("ok");
    expect(judgeTap(beats, judged, 5000)).toBeNull();
    expect(rhythmScore(["good", "ok", "miss", null])).toBe(2);
  });
});
