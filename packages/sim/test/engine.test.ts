import { describe, expect, it } from "vitest";
import { createPet, createRoom } from "../src/pet.ts";
import { simulate, TICK_MS, type World } from "../src/engine.ts";
import { HOUR, DAY, localHour } from "../src/clock.ts";

const TZ = "Asia/Tokyo";
// 2026-01-05 09:00 JST
const START = Date.UTC(2026, 0, 5, 0, 0);

function newWorld(): World {
  return { pet: createPet({ id: "pet-1", name: "テスト", now: START }), room: createRoom(), lastSimulatedAt: START };
}

describe("simulate", () => {
  it("1 時間でたまごがかえる", () => {
    const { world, events } = simulate(newWorld(), START + HOUR, { timezone: TZ, lastSeenAt: START });
    expect(world.pet.state.stage).toBe("baby");
    expect(events.map((e) => e.eventId)).toContain("hatch");
  });

  it("一度に進めても分けて進めても結果が同じ（決定論）", () => {
    const ctx = { timezone: TZ, lastSeenAt: START };
    const end = START + 2 * DAY;
    const once = simulate(newWorld(), end, ctx);
    const half = simulate(newWorld(), START + DAY + 7 * 60_000, ctx);
    const twice = simulate(half.world, end, ctx);
    expect(twice.world).toEqual(once.world);
    expect([...half.events, ...twice.events]).toEqual(once.events);
  });

  it("tick は 10 分境界にそろう", () => {
    const { world } = simulate(newWorld(), START + HOUR + 5 * 60_000, { timezone: TZ, lastSeenAt: START });
    expect(world.lastSimulatedAt % TICK_MS).toBe(0);
  });

  it("時計が戻っても何もしない", () => {
    const { world, events } = simulate(newWorld(), START - HOUR, { timezone: TZ, lastSeenAt: START });
    expect(events).toEqual([]);
    expect(world.lastSimulatedAt).toBe(START);
  });

  it("入力の状態を書き換えない", () => {
    const w = newWorld();
    const before = structuredClone(w);
    simulate(w, START + DAY, { timezone: TZ, lastSeenAt: START });
    expect(w).toEqual(before);
  });

  it("夜は寝ていて、寝たときと起きたときの両方が日記に残る", () => {
    const { events } = simulate(newWorld(), START + 2 * DAY, { timezone: TZ, lastSeenAt: START });
    const starts = events.filter((e) => e.eventId === "sleep_start");
    const ends = events.filter((e) => e.eventId === "sleep_end");
    expect(starts.length).toBeGreaterThanOrEqual(1);
    expect(ends.length).toBe(starts.length);
    starts.forEach((s, i) => {
      const h = localHour(s.at, TZ);
      expect(h >= 20 || h < 3).toBe(true);
      expect(ends[i]!.at - s.at).toBeGreaterThan(5 * HOUR);
      expect(ends[i]!.text).toMatch(/時間/);
    });
  });

  it("起きた記録は、同時刻に起きたほかの出来事より前に並ぶ", () => {
    const { events } = simulate(newWorld(), START + 3 * DAY, { timezone: TZ, lastSeenAt: START });
    for (const end of events.filter((e) => e.eventId.endsWith("_end"))) {
      const sameTime = events.filter((e) => e.at === end.at);
      expect(sameTime[0]).toBe(end);
    }
  });

  it("留守中におなかが空くと冷蔵庫を開け、自立・食いしん坊に寄る", () => {
    const { world, events } = simulate(newWorld(), START + 3 * DAY, { timezone: TZ, lastSeenAt: START });
    expect(events.some((e) => e.eventId === "eat")).toBe(true);
    expect(world.pet.state.personality.appetite).toBeGreaterThan(newWorld().pet.state.personality.appetite);
  });

  it("日記の量が 1 日あたり常識的な範囲に収まる", () => {
    const { events } = simulate(newWorld(), START + 3 * DAY, { timezone: TZ, lastSeenAt: START });
    const perDay = events.length / 3;
    expect(perDay).toBeGreaterThan(5);
    expect(perDay).toBeLessThan(40);
  });

  it("72 時間より古い分は簡易シミュレーションで、普通の出来事は残さない", () => {
    const end = START + 10 * DAY;
    const { world, events } = simulate(newWorld(), end, { timezone: TZ, lastSeenAt: START });
    expect(world.lastSimulatedAt).toBeLessThanOrEqual(end);
    expect(world.lastSimulatedAt).toBeGreaterThan(end - TICK_MS);
    const old = events.filter((e) => e.at < end - 72 * HOUR - HOUR);
    expect(old.every((e) => e.importance !== "normal")).toBe(true);
    expect(events.filter((e) => e.eventId === "evolve").map((e) => e.text.slice(0, 5))).toEqual(["こどもになっ", "ティーンにな", "おとなになっ"].map((x) => x.slice(0, 5)));
  });

  it("留守が続くとたまに自撮りする。明るい時間だけで、1 日 1 回まで・たまるのは 3 枚まで", () => {
    const { world, events } = simulate(newWorld(), START + 40 * DAY, { timezone: TZ, lastSeenAt: START });
    const selfies = events.filter((e) => e.eventId === "selfie");
    expect(selfies.length).toBeGreaterThan(0);
    for (const e of selfies) {
      const h = localHour(e.at, TZ);
      expect(h >= 9 && h < 17).toBe(true);
      expect(e.importance).toBe("rare");
    }
    for (let i = 1; i < selfies.length; i++) expect(selfies[i]!.at - selfies[i - 1]!.at).toBeGreaterThanOrEqual(DAY);
    expect(world.pet.state.selfies.length).toBeLessThanOrEqual(3);
    expect(world.pet.state.selfies[0]).toMatchObject({ at: selfies[0]!.at, text: selfies[0]!.text });
  });

  it("見ているあいだは自撮りしない", () => {
    let w = newWorld();
    let count = 0;
    for (let t = START + HOUR; t <= START + 20 * DAY; t += HOUR) {
      const r = simulate(w, t, { timezone: TZ, lastSeenAt: t });
      count += r.events.filter((e) => e.eventId === "selfie").length;
      w = r.world;
    }
    expect(count).toBe(0);
  });

  it("孵化・進化・シニアの節目が、見るまで ceremonies にたまる（最期の日は入れない・4 つまで）", () => {
    const early = simulate(newWorld(), START + 2 * HOUR, { timezone: TZ, lastSeenAt: START });
    expect(early.world.pet.state.ceremonies).toEqual([
      expect.objectContaining({ kind: "hatch", stage: "baby", fromSpecies: "egg", fromStage: "egg", toSpecies: "pocco" }),
    ]);

    const { world } = simulate(newWorld(), START + 13 * DAY + 12 * HOUR, { timezone: TZ, lastSeenAt: START });
    const list = world.pet.state.ceremonies;
    // 孵化・こども・ティーン・おとな・シニア の 5 つのうち、新しい 4 つ
    expect(list.map((c) => c.kind)).toEqual(["evolve", "evolve", "evolve", "senior"]);
    expect(list.map((c) => c.stage)).toEqual(["child", "teen", "adult", "senior"]);
    expect(list[1]!.fromSpecies).toBe(list[0]!.toSpecies);
    expect(list[3]!.fromSpecies).toBe(list[3]!.toSpecies);
    expect(world.pet.state.stage).toBe("final_day");
  });
});
