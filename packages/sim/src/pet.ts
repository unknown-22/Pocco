import type { Pet, PetState, RoomState } from "./types.ts";
import { createRng, hashSeed, randInt } from "./rng.ts";
import { TASTE_TAGS } from "./foods.ts";

/** 生まれつきの服の好み。スタイルごとに -20〜20。 */
export function innateWearTaste(petId: string): Record<string, number> {
  const rng = createRng(hashSeed(petId, "wear"));
  return Object.fromEntries(["cute", "cool", "funny", "natural"].map((st) => [st, randInt(rng, -20, 20)]));
}

/** 生まれつきの食の好み。タグごとに -30〜30。 */
export function innateFoodPrefs(petId: string): Record<string, number> {
  const rng = createRng(hashSeed(petId, "prefs"));
  return Object.fromEntries(TASTE_TAGS.map((tag) => [tag, randInt(rng, -30, 30)]));
}

/** 新しいたまごを作る。性格はシードから決まる小さなばらつきを持つ。 */
export function createPet(opts: {
  id: string;
  name: string;
  now: number;
  generation?: number;
  parentId?: string | null;
}): Pet {
  const rng = createRng(hashSeed(opts.id, "birth"));
  const jitter = () => randInt(rng, -10, 10);
  const state: PetState = {
    stage: "egg",
    speciesId: "egg",
    needs: { hunger: 20, sleepiness: 0, boredom: 10, loneliness: 0 },
    personality: {
      energy: jitter(),
      tidiness: jitter(),
      curiosity: jitter(),
      attachment: jitter(),
      appetite: jitter(),
      chronotype: jitter(),
    },
    foodPrefs: innateFoodPrefs(opts.id),
    hobbies: [],
    activity: { type: "egg", since: opts.now },
    equipped: {},
    lifespanModifier: 0,
    stats: {},
    cooldowns: {},
    drift: { day: "", used: {} },
    today: { day: "", sleptOnTime: false, wokenAtNight: false, tags: [], played: false },
    treasures: [],
    inheritedHobbies: [],
    selfies: [],
    ceremonies: [],
  };
  return {
    id: opts.id,
    generation: opts.generation ?? 1,
    parentId: opts.parentId ?? null,
    name: opts.name,
    bornAt: opts.now,
    diedAt: null,
    state,
  };
}

export function createRoom(): RoomState {
  return {
    mess: 0,
    wallpaperId: "wall_cream",
    floorId: "floor_wood",
    furniture: { floor_left: "plant_pot" },
    litter: [],
  };
}

/** 古い部屋データを直す（P3 以前は家具の場所の形式が違った） */
export function normalizeRoom(room: RoomState): RoomState {
  const valid = new Set(["wall_left", "wall_right", "floor_left", "floor_right"]);
  for (const slot of Object.keys(room.furniture)) if (!valid.has(slot)) delete room.furniture[slot];
  return room;
}
