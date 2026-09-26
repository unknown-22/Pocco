import { describe, expect, it } from "vitest";
import { createPet, createRoom, innateWearTaste } from "../src/pet.ts";
import { simulate, type World } from "../src/engine.ts";
import { decorate, equip } from "../src/care.ts";
import { WEARABLES, wearAffinity } from "../src/decor.ts";
import { collectionCatalog, completionRate, eventEntryOf, EVENT_ENTRIES, REWARDS } from "../src/collection.ts";
import { DAY, HOUR } from "../src/clock.ts";

const TZ = "Asia/Tokyo";
const START = Date.UTC(2026, 0, 5, 0, 0);
const ctx = { timezone: TZ };

function awakeWorld(id = "decor-1"): { world: World; t: number } {
  const t = START + 2 * HOUR;
  const { world } = simulate(
    { pet: createPet({ id, name: "x", now: START }), room: createRoom(), lastSimulatedAt: START },
    t,
    { timezone: TZ, lastSeenAt: t },
  );
  world.pet.state.activity = { type: "idle", since: t, spot: "rug" };
  return { world, t };
}

describe("equip", () => {
  it("着せると装備され、好みで反応が変わる", () => {
    const { world, t } = awakeWorld();
    world.pet.state.personality.attachment = 90;
    const cute = equip(world, "clothes", "scarf_red", t, ctx);
    expect(world.pet.state.equipped.clothes).toBe("scarf_red");
    expect(cute.reaction).toBe("love");
    world.pet.state.personality.attachment = -90;
    world.pet.state.personality.energy = -90;
    expect(equip(world, "hand", "lollipop", t, ctx).reaction).toBe("dislike");
  });

  it("脱がせられる。スロットが違う物は着せられない", () => {
    const { world, t } = awakeWorld();
    equip(world, "hat", "beret", t, ctx);
    equip(world, "hat", null, t, ctx);
    expect(world.pet.state.equipped.hat).toBeUndefined();
    expect(() => equip(world, "hat", "ribbon", t, ctx)).toThrow();
  });

  it("嫌いな服は、留守のあいだに脱ぎ捨てることがある", () => {
    const { world, t } = awakeWorld("wear-off");
    const s = world.pet.state;
    s.personality = { energy: -90, tidiness: 0, curiosity: -90, attachment: -90, appetite: 0, chronotype: 0 };
    const disliked = WEARABLES.filter((w) => wearAffinity(s.personality, innateWearTaste(world.pet.id), w) < -20);
    expect(disliked.length).toBeGreaterThan(0);
    s.equipped[disliked[0]!.slot] = disliked[0]!.id;
    const r = simulate(world, t + 3 * DAY, { timezone: TZ, lastSeenAt: t });
    expect(r.events.some((e) => e.eventId === "wear_off")).toBe(true);
    expect(r.world.pet.state.equipped[disliked[0]!.slot]).toBeUndefined();
  });
});

describe("decorate", () => {
  it("壁紙・床・家具を変えられる。同じ家具は 1 か所だけ", () => {
    const { world, t } = awakeWorld();
    decorate(world, "wallpaper", "wall_night", t, ctx);
    decorate(world, "floor", "floor_tile", t, ctx);
    decorate(world, "floor_right", "plant_pot", t, ctx);
    expect(world.room).toMatchObject({ wallpaperId: "wall_night", floorId: "floor_tile" });
    expect(world.room.furniture).toEqual({ floor_right: "plant_pot" });
  });

  it("壁に床の家具は置けない", () => {
    const { world, t } = awakeWorld();
    expect(() => decorate(world, "wall_left", "bookshelf", t, ctx)).toThrow();
  });

  it("置いた家具をペットが使い、趣味のきっかけになる", () => {
    const { world, t } = awakeWorld("plant");
    world.pet.state.personality.tidiness = 40;
    world.room.furniture = { floor_left: "plant_pot", floor_right: "bookshelf" };
    const r = simulate(world, t + 3 * DAY, { timezone: TZ, lastSeenAt: t });
    expect(r.events.some((e) => e.eventId.startsWith("furniture_"))).toBe(true);
    expect(r.world.pet.state.hobbies).toContain("gardening");
  });
});

describe("図鑑", () => {
  it("日記の出来事がイベントとして登録される", () => {
    expect(eventEntryOf({ eventId: "eat", importance: "normal" })).toBe("fridge");
    expect(eventEntryOf({ eventId: "walk_end", importance: "normal" })).toBeNull();
    expect(eventEntryOf({ eventId: "walk_end", importance: "rare" })).toBe("walk_rare");
    const ids = EVENT_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("達成率を計算できる。知らないエントリは数えない", () => {
    const catalog = collectionCatalog();
    const all = Object.entries(catalog).flatMap(([category, ids]) => ids.map((entryId) => ({ category, entryId })));
    expect(completionRate(all)).toBe(100);
    expect(completionRate([{ category: "species", entryId: "nope" }])).toBe(0);
    expect(REWARDS.at(-1)!.at).toBe(100);
  });
});

describe("ごほうび限定の着せ替え", () => {
  it("王冠は成長のお祝いや散歩では手に入らない", async () => {
    const { GIFT_WEARABLES } = await import("../src/decor.ts");
    expect(GIFT_WEARABLES.some((w) => w.id === "crown_gold")).toBe(false);
  });
});
