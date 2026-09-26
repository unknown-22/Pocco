import { describe, expect, it } from "vitest";
import { createPet, createRoom } from "../src/pet.ts";
import { simulate, type World, type SimResult } from "../src/engine.ts";
import { depart, inherit, lastWords, evaluateDay } from "../src/life.ts";
import { getSpecies } from "../src/species.ts";
import { DAY, HOUR } from "../src/clock.ts";

const TZ = "Asia/Tokyo";
const START = Date.UTC(2026, 0, 5, 0, 0);

/** 毎日 1 回だけ見に来る飼い主で days 日進める */
function live(id: string, days: number) {
  let world: World = { pet: createPet({ id, name: "ポッコ", now: START }), room: createRoom(), lastSimulatedAt: START };
  const all: SimResult = { world, events: [], gains: [], discoveries: [] };
  for (let d = 1; d <= days; d++) {
    const r = simulate(world, START + d * DAY, { timezone: TZ, lastSeenAt: START + (d - 1) * DAY });
    all.events.push(...r.events);
    all.gains.push(...r.gains);
    all.discoveries.push(...r.discoveries);
    world = r.world;
  }
  all.world = world;
  return all;
}

describe("一生", () => {
  const life = live("life-test", 16);
  const pet = life.world.pet;

  it("こども・ティーン・おとなに進化し、図鑑に種族が登録される", () => {
    const species = life.discoveries.filter((d) => d.category === "species").map((d) => getSpecies(d.entryId).stage);
    expect(species).toEqual(["baby", "child", "teen", "adult"]);
  });

  it("14 日前後で、誰にも看取られずに旅立つ", () => {
    expect(pet.diedAt).not.toBeNull();
    const age = pet.diedAt! - pet.bornAt;
    expect(age).toBeGreaterThanOrEqual(14 * DAY - 12 * HOUR);
    expect(age).toBeLessThanOrEqual(14 * DAY + 12 * HOUR);
    expect(pet.state.stage).toBe("departed");
    expect(pet.state.farewell).toMatchObject({ witnessed: false, seen: false });
    expect(pet.state.farewell!.lastWords.at(-1)).toBe("……ありがとう");
    expect(life.events.at(-1)!.eventId).toBe("departed");
  });

  it("最期の日の前にシニアになる", () => {
    const ids = life.events.map((e) => e.eventId);
    expect(ids.indexOf("stage_senior")).toBeLessThan(ids.indexOf("final_day"));
    expect(ids.indexOf("final_day")).toBeLessThan(ids.indexOf("departed"));
  });

  it("旅立ったあとは何も起きない", () => {
    const after = simulate(life.world, START + 20 * DAY, { timezone: TZ, lastSeenAt: START });
    expect(after.events).toEqual([]);
  });

  it("留守のあいだに散歩に出て、何かを拾ってくる", () => {
    const starts = life.events.filter((e) => e.eventId === "out_start");
    const ends = life.events.filter((e) => e.eventId === "walk_end");
    expect(starts.length).toBeGreaterThan(3);
    expect(ends.length).toBe(starts.length);
    expect(life.gains.length).toBeGreaterThanOrEqual(ends.length);
  });

  it("趣味を見つける（最大 3 つ）", () => {
    expect(pet.state.hobbies.length).toBeGreaterThan(0);
    expect(pet.state.hobbies.length).toBeLessThanOrEqual(3);
  });
});

describe("散歩", () => {
  it("ずっと見ている間は散歩に出ない", () => {
    let world: World = { pet: createPet({ id: "stay", name: "x", now: START }), room: createRoom(), lastSimulatedAt: START };
    const events = [];
    for (let t = START + 10 * 60_000; t <= START + 2 * DAY; t += 10 * 60_000) {
      const r = simulate(world, t, { timezone: TZ, lastSeenAt: t });
      events.push(...r.events);
      world = r.world;
    }
    expect(events.some((e) => e.eventId === "out_start")).toBe(false);
  });
});

describe("旅立ちと世代交代", () => {
  it("看取ると、最後のひとことと一緒に記録される", () => {
    const pet = createPet({ id: "w", name: "モチ", now: START });
    pet.state.stats.food_apple = 5;
    const events = depart(pet, START + 14 * DAY, true);
    expect(pet.state.farewell!.witnessed).toBe(true);
    expect(pet.state.farewell!.lastWords[0]).toBe("りんご、いっぱい くれたね");
    expect(events[0]!.text).toContain("モチ");
  });

  it("次の世代は性格の一部と親の趣味を受け継ぐ", () => {
    const parent = createPet({ id: "p", name: "ポッコ", now: START });
    parent.state.personality.tidiness = 80;
    parent.state.hobbies = ["reading"];
    const child = inherit(parent, "c", START + 15 * DAY);
    expect(child.generation).toBe(2);
    expect(child.parentId).toBe("p");
    expect(child.name).toBe("ポッコ2世");
    expect(child.state.stage).toBe("egg");
    expect(child.state.personality.tidiness).toBeGreaterThanOrEqual(20 - 8);
    expect(child.state.inheritedHobbies).toEqual(["reading"]);
    expect(inherit(child, "g", START).name).toBe("ポッコ3世");
  });

  it("最後のひとことは最大 3 行で、最後はありがとう", () => {
    const pet = createPet({ id: "x", name: "x", now: START });
    Object.assign(pet.state.stats, { food_cake: 9, eat: 20, care_talk: 30, walk: 9 });
    pet.state.hobbies = ["music"];
    const words = lastWords(pet);
    expect(words.length).toBe(3);
    expect(words.at(-1)).toBe("……ありがとう");
  });
});

describe("寿命の前後", () => {
  it("放置しても大きく減らない。夜に起こし続けると縮む", () => {
    const base = { day: "d", sleptOnTime: true, wokenAtNight: false, tags: [], played: false };
    expect(evaluateDay(base)).toBeGreaterThan(0);
    expect(evaluateDay({ ...base, wokenAtNight: true })).toBeLessThan(0);
    expect(evaluateDay({ ...base, tags: ["sweet", "veggie", "meat"], played: true })).toBe(1);
  });
});
