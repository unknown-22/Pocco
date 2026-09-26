// シミュレーションエンジン（仕様書 4 章・8 章）。
// 「状態 + 時刻 → 新しい状態 + 出来事」の純関数。サーバーの定期実行と
// リクエスト時のキャッチアップが同じ結果になるよう、tick は 10 分境界にそろえる。

import { HOUR, MINUTE, dayKey, localHour } from "./clock.ts";
import { drift, inSleepWindow } from "./personality.ts";
import { createRng, hashSeed, randInt, type Rng } from "./rng.ts";
import { stageForAge } from "./stage.ts";
import { innateFoodPrefs } from "./pet.ts";
import { FOODS, foodAffinity, type Food } from "./foods.ts";
import { pickText } from "./texts.ts";
import type {
  Activity,
  ActivityType,
  Importance,
  Pet,
  PetState,
  RoomState,
  Spot,
  Stage,
  TimelineEvent,
} from "./types.ts";

export const TICK_MS = 10 * MINUTE;
export const COARSE_TICK_MS = HOUR;
/** これより古い分は 1 時間 tick の簡易シミュレーション（仕様書 4.4） */
export const FULL_WINDOW_MS = 72 * HOUR;
/** 最後に見てからこれだけ経つと「留守」扱い */
export const ABSENT_AFTER_MS = 30 * MINUTE;

export interface World {
  pet: Pet;
  room: RoomState;
  lastSimulatedAt: number;
}

export interface SimContext {
  timezone: string;
  /** 最後にユーザーがアプリを見ていた時刻 */
  lastSeenAt: number;
}

export interface SimResult {
  world: World;
  events: TimelineEvent[];
}

/** 時間のかかる行動。始まったときと終わったときの両方を日記に書く */
const LONG_ACTIVITIES = new Set<ActivityType>(["sleep", "nap"]);
/** 始まったときに 1 件だけ日記に書く行動 */
const LOGGED_ON_START = new Set<ActivityType>(["play", "window"]);

/** 「8時間」「40分」「1時間20分」 */
export function formatDuration(ms: number): string {
  const total = Math.round(ms / MINUTE);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}分`;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));

/** 古いセーブデータに足りない項目を補う。 */
export function normalizePet(pet: Pet): Pet {
  normalizePetState(pet.state);
  if (Object.keys(pet.state.foodPrefs).length === 0) pet.state.foodPrefs = innateFoodPrefs(pet.id);
  return pet;
}

function normalizePetState(state: PetState): PetState {
  state.cooldowns ??= {};
  state.drift ??= { day: "", used: {} };
  state.stats ??= {};
  if (!state.activity?.type) state.activity = { type: "idle", since: 0 };
  if (state.stage === "egg") state.activity = { ...state.activity, type: "egg" };
  return state;
}

export function simulate(input: World, to: number, ctx: SimContext): SimResult {
  const world = structuredClone(input);
  normalizePet(world.pet);
  const events: TimelineEvent[] = [];

  // 時計が戻った場合は何もしない
  if (to <= world.lastSimulatedAt) return { world, events };

  let t = Math.floor(world.lastSimulatedAt / TICK_MS) * TICK_MS + TICK_MS;
  while (t <= to) {
    const coarse = to - t > FULL_WINDOW_MS && t % COARSE_TICK_MS === 0;
    const step = coarse ? COARSE_TICK_MS : TICK_MS;
    const emit = (e: TimelineEvent) => {
      // 簡易シミュレーション中は重要な出来事だけ残す
      if (!coarse || e.importance !== "normal") events.push(e);
    };
    tick(world, t, step, ctx, emit);
    world.lastSimulatedAt = t;
    t += step;
  }
  return { world, events };
}

function tick(
  world: World,
  t: number,
  step: number,
  ctx: SimContext,
  emit: (e: TimelineEvent) => void,
) {
  const { pet, room } = world;
  const s = pet.state;
  if (pet.diedAt !== null) return;

  const rng = createRng(hashSeed(pet.id, t));
  const hour = localHour(t, ctx.timezone);
  const day = dayKey(t, ctx.timezone);
  const absent = t - ctx.lastSeenAt > ABSENT_AFTER_MS;
  const night = hour >= 19 || hour < 5;

  let sink = emit;
  const log = (
    eventId: string,
    importance: Importance,
    extra: Partial<TimelineEvent> = {},
    spot?: Spot,
    duration?: string,
    food?: string,
  ) => {
    const lonely = s.needs.loneliness > 60;
    sink({
      at: t,
      eventId,
      importance,
      kind: "pet",
      text: pickText(eventId, { state: s, night, lonely, spot, duration, food }, rng),
      ...extra,
    });
  };

  // --- 成長 ---
  const stage = stageForAge(t - pet.bornAt);
  if (stage !== s.stage) {
    const from = s.stage;
    s.stage = stage;
    s.speciesId = stage;
    if (from === "egg") {
      s.activity = { type: "idle", since: t, until: t + TICK_MS, spot: "rug" };
      log("hatch", "major");
    } else {
      log(`stage_${stage}` satisfies `stage_${Stage}`, "major");
    }
  }
  if (s.stage === "egg") return;

  // --- 欲求 ---
  const dtH = step / HOUR;
  const act = s.activity;
  const asleep = act.type === "sleep" || act.type === "nap";
  const n = s.needs;
  n.hunger = clamp(n.hunger + (asleep ? 2 : 6) * dtH * (1 + s.personality.appetite / 200));
  n.sleepiness = clamp(n.sleepiness + (asleep ? -18 : 5) * dtH);
  n.boredom = clamp(n.boredom + (asleep ? 0 : act.type === "play" ? -30 : 8) * dtH);
  n.loneliness = clamp(n.loneliness + (absent ? 5 : -30) * dtH);

  // 散らかった部屋に長くいると、ずぼらになっていく（仕様書 10.3）
  if (room.mess > 60 && rng() < 0.03) drift(s, "tidiness", -1, day);

  // --- 今の行動を続けるか ---
  const sleepTime = inSleepWindow(hour, s.personality);
  let done: boolean;
  switch (act.type) {
    case "sleep":
      done = !sleepTime && n.sleepiness < 35 && !(room.lightsOff && n.sleepiness > 10);
      break;
    case "nap":
      done = n.sleepiness < 20 || t >= (act.until ?? t);
      break;
    default:
      done = t >= (act.until ?? t) || (sleepTime && n.sleepiness >= 25);
  }
  if (!done) return;

  // 次の行動を選ぶ間に起きた出来事は、終わった行動の記録のあとに並べる
  const during: TimelineEvent[] = [];
  sink = (e) => during.push(e);
  chooseNext(t);
  sink = emit;
  const next = s.activity;

  // 同じ行動が続いたら 1 つにまとめる（仕様書 9.2）
  if (next.type === act.type && (LONG_ACTIVITIES.has(act.type) || LOGGED_ON_START.has(act.type))) {
    next.since = act.since;
    during.forEach(emit);
    return;
  }
  // 時間のかかる行動は、終わったときにも書く
  if (act.type === "sleep" && room.lightsOff) room.lightsOff = false; // 起きたら自分で電気をつける
  if (LONG_ACTIVITIES.has(act.type)) {
    log(`${act.type}_end`, "normal", {}, act.spot, formatDuration(t - act.since));
  }
  during.forEach(emit);
  if (LONG_ACTIVITIES.has(next.type)) {
    log(`${next.type}_start`, "normal", {}, next.spot);
  } else if (LOGGED_ON_START.has(next.type)) {
    log(next.type, "normal", {}, next.spot);
  }

  // --- 次の行動を選ぶ ---
  function chooseNext(t: number) {
  // --- 次の行動を選ぶ（仕様書 8 章） ---
  const start = (type: ActivityType, minutes: number, spot: Spot) => {
    s.activity = { type, since: t, until: t + minutes * MINUTE, spot } satisfies Activity;
  };
  const cooled = (id: string, ms: number) => t - (s.cooldowns[id] ?? -Infinity) >= ms;
  const mark = (id: string) => {
    s.cooldowns[id] = t;
    s.stats[id] = (s.stats[id] ?? 0) + 1;
  };

  if (sleepTime && n.sleepiness >= 25) {
    start("sleep", 60, "bed");
    return;
  }
  // 電気が消えていると寝つきやすい
  if (room.lightsOff && n.sleepiness >= 15) {
    if (sleepTime) start("sleep", 60, "bed");
    else start("nap", randInt(rng, 30, 90), "bed");
    return;
  }
  if (n.sleepiness >= 85) {
    start("nap", randInt(rng, 30, 90), rng() < 0.5 ? "rug" : "floor");
    return;
  }
  // おなかが空いて誰もいないと、自分で冷蔵庫を開ける（仕様書 6.1）
  if (n.hunger >= 70 && absent && cooled("eat", 3 * HOUR) && rng() < 0.7) {
    mark("eat");
    // 好きなものほど選ばれやすい → 放っておくと好みが偏る（仕様書 6.1）
    const food = pickFridgeFood(s, rng);
    for (const tag of food.tags) s.foodPrefs[tag] = Math.min(100, (s.foodPrefs[tag] ?? 0) + 2);
    log("eat", "normal", {}, "fridge", undefined, food.name);
    n.hunger = clamp(n.hunger - 40);
    room.mess = clamp(room.mess + 8);
    addLitter(room, rng, t, "crumb");
    drift(s, "attachment", -1, day);
    drift(s, "appetite", +1, day);
    start("eat", 10, "fridge");
    return;
  }

  const p = s.personality;
  const options: { type?: ActivityType; weight: number; run: () => void }[] = [
    { type: "wander", weight: 3, run: () => start("wander", randInt(rng, 10, 30), "floor") },
    { type: "idle", weight: 2, run: () => start("idle", randInt(rng, 10, 20), "rug") },
    {
      type: "play",
      weight: (n.boredom / 20) * (1 + p.energy / 100),
      run: () => {
        mark("play");
        drift(s, "energy", +1, day);
        start("play", randInt(rng, 20, 40), "rug");
      },
    },
    {
      // お昼すぎの昼寝
      type: "nap",
      weight: n.sleepiness > 40 && hour >= 12 && hour < 17 && cooled("nap", 4 * HOUR) ? 1 : 0,
      run: () => {
        mark("nap");
        start("nap", randInt(rng, 30, 90), rng() < 0.5 ? "rug" : "floor");
      },
    },
    {
      type: "window",
      weight: 0.6 + n.loneliness / 60,
      run: () => {
        if (n.loneliness > 60) drift(s, "attachment", p.attachment >= 0 ? +1 : -1, day);
        start("window", randInt(rng, 10, 30), "window");
      },
    },
    {
      weight: n.boredom > 40 && cooled("mess", 2 * HOUR) ? 1 - p.tidiness / 100 : 0,
      run: () => {
        mark("mess");
        log("mess", "normal");
        room.mess = clamp(room.mess + 15);
        addLitter(room, rng, t, rng() < 0.5 ? "paper" : "toy");
        drift(s, "tidiness", -1, day);
        start("idle", 10, "floor");
      },
    },
    {
      weight: room.mess > 20 && p.tidiness > 10 ? p.tidiness / 40 : 0,
      run: () => {
        mark("tidy");
        room.mess = clamp(room.mess - 20);
        room.litter.splice(0, 2);
        drift(s, "tidiness", +1, day);
        log("tidy", "normal");
        start("tidy", 10, "floor");
      },
    },
    {
      weight: cooled("find", 6 * HOUR) ? 0.15 * (1 + p.curiosity / 100) * (room.mess > 20 ? 2 : 1) : 0,
      run: () => {
        mark("find");
        drift(s, "curiosity", +1, day);
        log("find", "rare");
        start("idle", 10, "floor");
      },
    },
    {
      weight: cooled("monologue", 2 * HOUR) ? 0.4 : 0,
      run: () => {
        mark("monologue");
        log("monologue", "normal");
        start("idle", 10, "rug");
      },
    },
  ];
  // 直前と同じ行動は選ばれにくくする
  for (const o of options) if (o.type === act.type) o.weight *= 0.3;
  weightedPick(options, rng).run();
  }
}

function weightedPick<T extends { weight: number }>(options: T[], rng: Rng): T {
  const valid = options.filter((o) => o.weight > 0);
  const total = valid.reduce((sum, o) => sum + o.weight, 0);
  let r = rng() * total;
  for (const o of valid) {
    r -= o.weight;
    if (r < 0) return o;
  }
  return valid[valid.length - 1]!;
}

const MAX_LITTER = 8;

function addLitter(room: RoomState, rng: Rng, t: number, kind: string) {
  if (room.litter.length >= MAX_LITTER) return;
  room.litter.push({
    id: `l_${t}_${room.litter.length}`,
    kind,
    x: randInt(rng, 30, 86),
    y: randInt(rng, 92, 122),
  });
}

function pickFridgeFood(s: PetState, rng: Rng): Food {
  return weightedPick(
    FOODS.map((f) => ({ food: f, weight: Math.max(5, foodAffinity(s.foodPrefs, f) + 100) })),
    rng,
  ).food;
}
