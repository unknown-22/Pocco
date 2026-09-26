// シミュレーションエンジン（仕様書 4 章・8 章）。
// 「状態 + 時刻 → 新しい状態 + 出来事」の純関数。サーバーの定期実行と
// リクエスト時のキャッチアップが同じ結果になるよう、tick は 10 分境界にそろえる。

import { HOUR, MINUTE, dayKey, localHour } from "./clock.ts";
import { drift, inSleepWindow } from "./personality.ts";
import { createRng, hashSeed, randInt, type Rng } from "./rng.ts";
import { stageForAge } from "./stage.ts";
import { innateFoodPrefs, normalizeRoom } from "./pet.ts";
import { FOODS, foodAffinity, type Food } from "./foods.ts";
import { pickText } from "./texts.ts";
import { SPECIES, getSpecies, speciesForStage } from "./species.ts";
import { HOBBIES, MAX_HOBBIES, getHobby } from "./hobbies.ts";
import { HOUSE_FINDS, getTreasure, pickWalkTreasure } from "./items.ts";
import { depart, emptyDay, keepsakeOf, today } from "./life.ts";
import { localParts } from "./clock.ts";
import { FURNITURE_SLOTS, GIFT_WEARABLES, getFurniture, getWearable, wearAffinity } from "./decor.ts";
import { innateWearTaste } from "./pet.ts";
import type {
  Activity,
  ActivityType,
  Importance,
  Pet,
  PetState,
  RoomState,
  Spot,
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

/** 持ち物に加わる物（サーバーが inventory に入れる） */
export interface Gain {
  itemId: string;
  kind: "treasure" | "food" | "wear";
  at: number;
}

/** 図鑑に登録するもの（P4 で表示） */
export interface Discovery {
  category: "species" | "hobby" | "treasure" | "food";
  entryId: string;
  at: number;
}

export interface SimResult {
  world: World;
  events: TimelineEvent[];
  gains: Gain[];
  discoveries: Discovery[];
}

/** 時間のかかる行動。始まったときと終わったときの両方を日記に書く */
const LONG_ACTIVITIES = new Set<ActivityType>(["sleep", "nap", "out"]);
/** 始まったときに 1 件だけ日記に書く行動 */
const LOGGED_ON_START = new Set<ActivityType>(["play", "window", "hobby"]);

/** 散歩に出るのは、最後に見てからこれだけ経ったとき（仕様書 10.6） */
export const WALK_AFTER_ABSENT_MS = 2 * HOUR;

/** 「8時間」「40分」「1時間20分」 */
export function formatDuration(ms: number): string {
  const total = Math.round(ms / MINUTE);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}分`;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));

const STAGE_LABEL: Record<string, string> = {
  baby: "ベビー",
  child: "こども",
  teen: "ティーン",
  adult: "おとな",
};

/** 古いセーブデータに足りない項目を補う。 */
export function normalizePet(pet: Pet): Pet {
  const s = pet.state;
  s.cooldowns ??= {};
  s.drift ??= { day: "", used: {} };
  s.stats ??= {};
  s.today ??= emptyDay("");
  s.treasures ??= [];
  s.inheritedHobbies ??= [];
  if (!s.activity?.type) s.activity = { type: "idle", since: 0 };
  if (s.stage === "egg") s.activity = { ...s.activity, type: "egg" };
  if (Object.keys(s.foodPrefs).length === 0) s.foodPrefs = innateFoodPrefs(pet.id);
  // P2 以前は種族の代わりに段階名が入っていた
  if (!SPECIES.some((sp) => sp.id === s.speciesId)) {
    s.speciesId = s.stage === "baby" ? "pocco" : speciesForStage(s.stage, "pocco", s.personality);
  }
  return pet;
}

export function simulate(input: World, to: number, ctx: SimContext): SimResult {
  const world = structuredClone(input);
  normalizePet(world.pet);
  normalizeRoom(world.room);
  const result: SimResult = { world, events: [], gains: [], discoveries: [] };

  // 時計が戻った場合は何もしない
  if (to <= world.lastSimulatedAt) return result;

  let t = Math.floor(world.lastSimulatedAt / TICK_MS) * TICK_MS + TICK_MS;
  while (t <= to) {
    const coarse = to - t > FULL_WINDOW_MS && t % COARSE_TICK_MS === 0;
    const step = coarse ? COARSE_TICK_MS : TICK_MS;
    const emit = (e: TimelineEvent) => {
      // 簡易シミュレーション中は重要な出来事だけ残す
      if (!coarse || e.importance !== "normal") result.events.push(e);
    };
    tick(world, t, step, ctx, emit, result);
    world.lastSimulatedAt = t;
    t += step;
  }
  return result;
}

function tick(
  world: World,
  t: number,
  step: number,
  ctx: SimContext,
  emit: (e: TimelineEvent) => void,
  out: SimResult,
) {
  const { pet, room } = world;
  const s = pet.state;
  if (pet.diedAt !== null) return;

  const rng = createRng(hashSeed(pet.id, t));
  const hour = localHour(t, ctx.timezone);
  const day = dayKey(t, ctx.timezone);
  const absent = t - ctx.lastSeenAt > ABSENT_AFTER_MS;
  const night = hour >= 19 || hour < 5;
  const daily = today(s, t, ctx.timezone);

  let sink = emit;
  const log = (
    eventId: string,
    importance: Importance,
    extra: Partial<TimelineEvent> = {},
    vars: { spot?: Spot; duration?: string; food?: string; item?: string } = {},
  ) => {
    const lonely = s.needs.loneliness > 60;
    sink({
      at: t,
      eventId,
      importance,
      kind: "pet",
      text: pickText(eventId, { state: s, night, lonely, ...vars }, rng),
      ...extra,
    });
  };
  const discover = (category: Discovery["category"], entryId: string) =>
    out.discoveries.push({ category, entryId, at: t });
  const gain = (itemId: string, kind: Gain["kind"]) => {
    out.gains.push({ itemId, kind, at: t });
    if (kind === "treasure") {
      if (!s.treasures.includes(itemId)) s.treasures.push(itemId);
      discover("treasure", itemId);
    }
  };

  // --- 成長・寿命（仕様書 7 章） ---
  const stage = stageForAge(t - pet.bornAt, s.lifespanModifier);
  if (stage === "departed") {
    // 最期の日に誰も来なかった → しずかに旅立つ
    for (const e of depart(pet, t, false)) sink(e);
    return;
  }
  if (stage !== s.stage) {
    const from = s.stage;
    s.stage = stage;
    s.speciesId = from === "egg" ? "pocco" : speciesForStage(stage, s.speciesId, s.personality);
    const species = getSpecies(s.speciesId);
    if (from === "egg") {
      s.activity = { type: "idle", since: t, until: t + TICK_MS, spot: "rug" };
      log("hatch", "major");
      discover("species", species.id);
    } else if (stage === "senior") {
      log("stage_senior", "major");
    } else if (stage === "final_day") {
      log("final_day", "rare");
    } else {
      log("evolve", "major", { text: `${STAGE_LABEL[stage] ?? stage}になった！「${species.name}」に育った。` });
      discover("species", species.id);
      // 成長の節目に着せ替えがひとつもらえる（仕様書 10.7）
      const wear = GIFT_WEARABLES[Math.floor(rng() * GIFT_WEARABLES.length)]!;
      gain(wear.id, "wear");
      log("growth_gift", "normal", { text: `お祝いに${wear.name}をもらった。` });
    }
  }
  if (s.stage === "egg") return;

  // --- 欲求 ---
  const dtH = step / HOUR;
  const act = s.activity;
  const asleep = act.type === "sleep" || act.type === "nap";
  const outside = act.type === "out";
  const aging = s.stage === "senior" || s.stage === "final_day" ? 1.3 : 1;
  const n = s.needs;
  n.hunger = clamp(n.hunger + (asleep ? 2 : 6) * dtH * (1 + s.personality.appetite / 200));
  n.sleepiness = clamp(n.sleepiness + (asleep ? -18 : 5 * aging) * dtH);
  n.boredom = clamp(n.boredom + (asleep ? 0 : act.type === "play" || outside ? -30 : 8) * dtH);
  n.loneliness = clamp(n.loneliness + (outside ? 1 : absent ? 5 : -30) * dtH);

  // 散らかった部屋に長くいると、ずぼらになっていく（仕様書 10.3）
  if (room.mess > 60 && !outside && rng() < 0.03) drift(s, "tidiness", -1, day);

  // --- 趣味を見つける（仕様書 6.4） ---
  if (!asleep && !outside && s.hobbies.length < MAX_HOBBIES && t - (s.cooldowns.hobby_found ?? -Infinity) >= 12 * HOUR) {
    const owned = new Set(s.treasures);
    const furniture = new Set(Object.values(room.furniture));
    const found = HOBBIES.find(
      (h) => !s.hobbies.includes(h.id) && h.discover(s, owned, s.inheritedHobbies.includes(h.id), furniture),
    );
    if (found) {
      s.hobbies.push(found.id);
      s.cooldowns.hobby_found = t;
      log("hobby_found", "major", { text: `趣味を見つけた：${found.name}！` });
      discover("hobby", found.id);
    }
  }

  // --- 着せ替えの好き嫌い（仕様書 10.7） ---
  const worn = (Object.entries(s.equipped) as [string, string | undefined][]).filter(([, id]) => id);
  if (!asleep && !outside && worn.length > 0 && t - (s.cooldowns.wear_check ?? -Infinity) >= 8 * HOUR) {
    s.cooldowns.wear_check = t;
    const taste = innateWearTaste(pet.id);
    for (const [slot, id] of worn) {
      const item = getWearable(id!);
      if (!item) continue;
      const affinity = wearAffinity(s.personality, taste, item);
      if (affinity < -20 && rng() < 0.5) {
        // 嫌いな服は脱ぎ捨てる。部屋がちらかる
        delete s.equipped[slot as keyof typeof s.equipped];
        room.mess = clamp(room.mess + 5);
        addLitter(room, rng, t, "paper");
        log("wear_off", "normal", { text: `${item.name}を脱ぎ捨てた。` });
        break;
      }
      if (affinity > 25 && rng() < 0.3) {
        drift(s, "attachment", +1, day);
        log("wear_like", "normal", { text: `お気に入りの${item.name}で、ごきげんだった。` });
        break;
      }
    }
  }

  // --- 散歩中のできごと ---
  // 1 回の散歩につき、あっても 1 つだけ
  if (outside && t < (act.until ?? t) && s.cooldowns.walk_event_for !== act.since && rng() < 0.12) {
    s.cooldowns.walk_event_for = act.since;
    log("walk_event", "normal");
  }

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
    case "out":
      done = t >= (act.until ?? t);
      break;
    default:
      done = t >= (act.until ?? t) || (sleepTime && n.sleepiness >= 25);
  }
  if (!done) return;

  // 次の行動を選ぶ間に起きた出来事は、終わった行動の記録のあとに並べる
  const during: TimelineEvent[] = [];
  sink = (e) => during.push(e);
  chooseNext();
  sink = emit;
  const next = s.activity;

  // 同じ行動が続いたら 1 つにまとめる（仕様書 9.2）
  const sameKind = next.type === act.type && next.hobbyId === act.hobbyId;
  if (sameKind && act.type !== "out" && (LONG_ACTIVITIES.has(act.type) || LOGGED_ON_START.has(act.type))) {
    next.since = act.since;
    during.forEach(emit);
    return;
  }
  if (act.type === "sleep" && room.lightsOff) room.lightsOff = false; // 起きたら自分で電気をつける
  // 時間のかかる行動は、終わったときにも書く
  if (act.type === "out") {
    endWalk(act.since);
  } else if (LONG_ACTIVITIES.has(act.type)) {
    log(`${act.type}_end`, "normal", {}, { spot: act.spot, duration: formatDuration(t - act.since) });
  }
  during.forEach(emit);
  if (next.type === "hobby") {
    const hobby = getHobby(next.hobbyId ?? "");
    if (hobby) log(`hobby_${hobby.id}`, "normal", { text: hobby.texts[Math.floor(rng() * hobby.texts.length)]! });
  } else if (LONG_ACTIVITIES.has(next.type)) {
    log(`${next.type}_start`, "normal", {}, { spot: next.spot });
  } else if (LOGGED_ON_START.has(next.type)) {
    log(next.type, "normal", {}, { spot: next.spot });
  }

  /** 散歩から帰る。何かを拾ってくる（仕様書 10.6） */
  function endWalk(since: number) {
    const duration = formatDuration(t - since);
    if (rng() < 0.08) {
      const wear = GIFT_WEARABLES[Math.floor(rng() * GIFT_WEARABLES.length)]!;
      gain(wear.id, "wear");
      log("walk_end", "rare", {}, { duration, item: wear.name });
      return;
    }
    if (rng() < 0.2) {
      const food = FOODS[Math.floor(rng() * FOODS.length)]!;
      gain(food.id, "food");
      log("walk_end", "normal", {}, { duration, item: food.name });
      return;
    }
    const month = localParts(t, ctx.timezone).month;
    const treasure = pickWalkTreasure(rng, month, s.personality.curiosity);
    gain(treasure.id, "treasure");
    log("walk_end", treasure.rarity === "rare" ? "rare" : "normal", {}, { duration, item: treasure.name });
  }

  // --- 次の行動を選ぶ（仕様書 8 章） ---
  function chooseNext() {
    const start = (type: ActivityType, minutes: number, spot: Spot, extra: Partial<Activity> = {}) => {
      s.activity = { type, since: t, until: t + minutes * MINUTE, spot, ...extra } satisfies Activity;
      if (type === "sleep" && sleepTime) daily.sleptOnTime = true;
    };
    const cooled = (id: string, ms: number) => t - (s.cooldowns[id] ?? -Infinity) >= ms;
    const mark = (id: string) => {
      s.cooldowns[id] = t;
      s.stats[id] = (s.stats[id] ?? 0) + 1;
    };
    const eatFromFridge = (amount: number) => {
      mark("eat");
      // 好きなものほど選ばれやすい → 放っておくと好みが偏る（仕様書 6.1）
      const food = pickFridgeFood(s, rng);
      for (const tag of food.tags) s.foodPrefs[tag] = Math.min(100, (s.foodPrefs[tag] ?? 0) + 2);
      log("eat", "normal", {}, { spot: "fridge", food: food.name });
      n.hunger = clamp(n.hunger - amount);
      room.mess = clamp(room.mess + 8);
      addLitter(room, rng, t, "crumb");
      drift(s, "attachment", -1, day);
      drift(s, "appetite", +1, day);
      start("eat", 10, "fridge");
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
      eatFromFridge(s.stage === "final_day" ? 20 : 40);
      return;
    }

    // 最期の日は静かに過ごす（仕様書 7.3）
    if (s.stage === "final_day") {
      const keepsake = getTreasure(keepsakeOf(s) ?? "");
      weightedPick(
        [
          { weight: 5, run: () => start("nap", randInt(rng, 40, 120), "bed") },
          { weight: 1.5, run: () => start("window", randInt(rng, 10, 30), "window") },
          {
            weight: 1,
            run: () => {
              log("quiet", "normal", {}, { item: keepsake?.name });
              start("idle", 20, "window");
            },
          },
        ],
        rng,
      ).run();
      return;
    }

    const p = s.personality;
    const senior = s.stage === "senior";
    const options: { type?: ActivityType; hobbyId?: string; weight: number; run: () => void }[] = [
      { type: "wander", weight: 3, run: () => start("wander", randInt(rng, 10, 30), "floor") },
      { type: "idle", weight: 2, run: () => start("idle", randInt(rng, 10, 20), "rug") },
      {
        type: "play",
        weight: (n.boredom / 20) * (1 + p.energy / 100) * (senior ? 0.5 : 1),
        run: () => {
          mark("play");
          drift(s, "energy", +1, day);
          start("play", randInt(rng, 20, 40), "rug");
        },
      },
      {
        // お昼すぎの昼寝
        type: "nap",
        weight: n.sleepiness > 40 && hour >= 12 && hour < 17 && cooled("nap", 4 * HOUR) ? (senior ? 2 : 1) : 0,
        run: () => {
          mark("nap");
          start("nap", randInt(rng, 30, 90), rng() < 0.5 ? "rug" : "floor");
        },
      },
      {
        type: "window",
        weight: 0.6 + n.loneliness / 60,
        run: () => {
          mark("window");
          if (n.loneliness > 60) drift(s, "attachment", p.attachment >= 0 ? +1 : -1, day);
          start("window", randInt(rng, 10, 30), "window");
        },
      },
      {
        // 散歩（しばらく誰も見ていない昼間だけ）
        type: "out",
        weight:
          t - ctx.lastSeenAt >= WALK_AFTER_ABSENT_MS &&
          hour >= 7 && hour < 18 &&
          n.sleepiness < 60 && n.hunger < 70 &&
          cooled("walk", 6 * HOUR)
            ? 1.2 * (1 + p.curiosity / 100) * (senior ? 0.4 : 1)
            : 0,
        run: () => {
          mark("walk");
          drift(s, "curiosity", +1, day);
          start("out", senior ? randInt(rng, 20, 60) : randInt(rng, 30, 180), "floor");
        },
      },
      // 部屋の家具を使う（仕様書 10.8）
      ...FURNITURE_SLOTS.flatMap((slot) => {
        const f = getFurniture(room.furniture[slot.id] ?? "");
        if (!f) return [];
        const nightOnly = f.id === "telescope";
        return [
          {
            weight: nightOnly && !night ? 0 : 0.5,
            run: () => {
              mark(`furniture_${f.id}`);
              log(`furniture_${f.id}`, "normal", { text: f.useTexts[Math.floor(rng() * f.useTexts.length)]! });
              start("idle", randInt(rng, 10, 20), "floor", { slot: slot.id });
            },
          },
        ];
      }),
      ...s.hobbies.map((id) => {
        const hobby = getHobby(id);
        return {
          type: "hobby" as const,
          hobbyId: id,
          weight: hobby ? 1.2 * (hobby.night ? (night ? 2 : 0.3) : 1) : 0,
          run: () => {
            mark(`hobby_${id}`);
            start("hobby", randInt(rng, 20, 40), "rug", { hobbyId: id });
          },
        };
      }),
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
          const item = getTreasure(HOUSE_FINDS[Math.floor(rng() * HOUSE_FINDS.length)]!)!;
          gain(item.id, "treasure");
          log("find", "rare", {}, { item: item.name });
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
    for (const o of options) if (o.type === act.type && o.hobbyId === act.hobbyId) o.weight *= 0.3;
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
