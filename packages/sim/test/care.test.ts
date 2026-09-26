import { describe, expect, it } from "vitest";
import { createPet, createRoom } from "../src/pet.ts";
import { simulate, type World } from "../src/engine.ts";
import { clean, feed, setLights, talk } from "../src/care.ts";
import { HOUR } from "../src/clock.ts";

const TZ = "Asia/Tokyo";
const START = Date.UTC(2026, 0, 5, 0, 0); // 9:00 JST
const ctx = { timezone: TZ };

/** 孵化済みで、起きていて、おなかが空いているペット */
function hungryBaby(): { world: World; t: number } {
  const t = START + 2 * HOUR;
  const { world } = simulate(
    { pet: createPet({ id: "care-1", name: "テスト", now: START }), room: createRoom(), lastSimulatedAt: START },
    t,
    { timezone: TZ, lastSeenAt: t },
  );
  world.pet.state.activity = { type: "idle", since: t, spot: "rug" };
  world.pet.state.needs.hunger = 80;
  return { world, t };
}

describe("feed", () => {
  it("食べるとおなかが満たされ、日記に残り、好みが強まる", () => {
    const { world, t } = hungryBaby();
    const before = world.pet.state.foodPrefs.sweet!;
    const r = feed(world, "cookie", t, ctx);
    expect(r.consumed).toBe(true);
    expect(world.pet.state.needs.hunger).toBeLessThan(80);
    expect(world.pet.state.foodPrefs.sweet).toBeGreaterThan(before);
    expect(r.events[0]!.kind).toBe("user");
    expect(r.events.some((e) => e.eventId === "first_food")).toBe(true);
  });

  it("何度もあげると好きになっていく", () => {
    const { world, t } = hungryBaby();
    world.pet.state.foodPrefs.veggie = -60;
    const reactions: string[] = [];
    for (let i = 0; i < 30; i++) {
      world.pet.state.needs.hunger = 80;
      reactions.push(feed(world, "carrot", t + i * HOUR, ctx).reaction);
    }
    expect(reactions[0]).toBe("dislike");
    expect(reactions.at(-1)).not.toBe("dislike");
  });

  it("おなかいっぱい・寝ているときは食べない", () => {
    const { world, t } = hungryBaby();
    world.pet.state.needs.hunger = 5;
    const full = feed(world, "apple", t, ctx);
    expect(full.reaction).toBe("full");
    expect(full.consumed).toBeFalsy();
    world.pet.state.needs.hunger = 80;
    world.pet.state.activity = { type: "sleep", since: t, spot: "bed" };
    expect(feed(world, "apple", t, ctx).reaction).toBe("asleep");
  });
});

describe("clean", () => {
  it("まとめて片付けると散らかりが 0 になり、きれい好きに寄る", () => {
    const { world, t } = hungryBaby();
    world.room.mess = 60;
    world.room.litter = [
      { id: "a", kind: "paper", x: 40, y: 100 },
      { id: "b", kind: "toy", x: 50, y: 100 },
    ];
    const before = world.pet.state.personality.tidiness;
    const r = clean(world, undefined, t, ctx);
    expect(world.room.litter).toEqual([]);
    expect(world.room.mess).toBe(0);
    expect(world.pet.state.personality.tidiness).toBe(before + 1);
    expect(r.events.length).toBe(1);
  });

  it("1 つだけ片付けられる", () => {
    const { world, t } = hungryBaby();
    world.room.mess = 30;
    world.room.litter = [
      { id: "a", kind: "paper", x: 40, y: 100 },
      { id: "b", kind: "toy", x: 50, y: 100 },
    ];
    clean(world, ["a"], t, ctx);
    expect(world.room.litter.map((l) => l.id)).toEqual(["b"]);
    expect(world.room.mess).toBe(20);
  });
});

describe("talk", () => {
  it("話しかけるとさびしさが減り、吹き出しが返る", () => {
    const { world, t } = hungryBaby();
    world.pet.state.needs.loneliness = 80;
    const r = talk(world, t, ctx);
    expect(r.bubble.length).toBeGreaterThan(0);
    expect(world.pet.state.needs.loneliness).toBe(60);
  });

  it("独り言（idle）は状態を変えない", () => {
    const { world, t } = hungryBaby();
    const before = structuredClone(world);
    talk(world, t, ctx, true);
    expect(world).toEqual(before);
  });

  it("寝ているときに話しかけると起きる", () => {
    const { world, t } = hungryBaby();
    world.pet.state.activity = { type: "sleep", since: t - HOUR, spot: "bed" };
    const r = talk(world, t, ctx);
    expect(world.pet.state.activity.type).toBe("idle");
    expect(r.events[0]!.eventId).toBe("wake");
  });
});

describe("setLights", () => {
  it("眠いときに電気を消すと寝る。起きたら電気がつく", () => {
    const { world, t } = hungryBaby();
    world.pet.state.needs.sleepiness = 50;
    const r = setLights(world, false, t, ctx);
    expect(world.room.lightsOff).toBe(true);
    expect(world.pet.state.activity.type).toBe("nap");
    expect(r.events.map((e) => e.eventId)).toEqual(["lights_off", "nap_start"]);
  });
});

describe("play", () => {
  it("遊ぶと退屈が減り、寿命のための『遊んだ』が記録される", async () => {
    const { play } = await import("../src/care.ts");
    const { world, t } = hungryBaby();
    world.pet.state.needs.boredom = 80;
    const r = play(world, "catch", { score: 7, success: true }, t, ctx);
    expect(world.pet.state.needs.boredom).toBe(40);
    expect(world.pet.state.today.played).toBe(true);
    expect(r.events[0]!.text).toBe("キャッチで遊んだ。7こ キャッチした！");
    expect(r.reaction).toBe("love");
  });

  it("寝ているときは遊べない", async () => {
    const { play } = await import("../src/care.ts");
    const { world, t } = hungryBaby();
    world.pet.state.activity = { type: "sleep", since: t, spot: "bed" };
    expect(play(world, "hide", { score: 0, success: false }, t, ctx).reaction).toBe("asleep");
  });

  it("のんびり屋はかくれんぼで寝てしまうことがある", async () => {
    const { gameAptitude } = await import("../src/care.ts");
    expect(gameAptitude({ energy: -50, tidiness: 0, curiosity: 0 }).sleepy).toBeGreaterThan(0);
    expect(gameAptitude({ energy: 50, tidiness: 0, curiosity: 0 }).speed).toBeGreaterThan(1);
  });
});
