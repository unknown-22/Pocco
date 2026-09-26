// ユーザーのおせわ（仕様書 10.1〜10.5）。どれも world をその場で書き換える。
// 呼ぶ前に simulate で現在時刻まで進めておくこと。

import { HOUR, dayKey, localHour, localParts } from "./clock.ts";
import { FOODS, TASTE_TAGS, foodAffinity, getFood, type TasteTag } from "./foods.ts";
import { drift, inSleepWindow } from "./personality.ts";
import { createRng, hashSeed, randInt, type Rng } from "./rng.ts";
import type { World } from "./engine.ts";
import type { PetState, TimelineEvent } from "./types.ts";
import { today } from "./life.ts";
import { FURNITURE_SLOTS, getFloor, getFurniture, getWallpaper, getWearable, wearAffinity, type WearSlot } from "./decor.ts";
import { innateWearTaste } from "./pet.ts";

export interface CareContext {
  timezone: string;
  /** 直前の留守の長さ（ミリ秒）。おかえりの挨拶に使う */
  awayMs?: number;
  /** 最近の日記（新しい順）。会話のネタに使う */
  recent?: Pick<TimelineEvent, "eventId" | "at" | "kind">[];
  /** 一生の大事なできごとを思い出として短くしたもの（最期の日の会話用） */
  memories?: string[];
}

export type Reaction = "love" | "normal" | "dislike" | "full" | "asleep" | "none";

export interface CareResult {
  /** ペットの吹き出し */
  bubble: string;
  reaction: Reaction;
  events: TimelineEvent[];
  /** 食べ物を 1 つ使ったか */
  consumed?: boolean;
  /** 掃除中に見つかった食べ物 */
  foundFoodId?: string;
}

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));
const isAsleep = (s: PetState) => s.activity.type === "sleep" || s.activity.type === "nap";
/** 散歩中・旅立ったあとは世話できない */
const isAway = (s: PetState) => s.activity.type === "out" || s.stage === "departed";
const AWAY: CareResult = { bubble: "", reaction: "none", events: [] };
const pick = <T>(rng: Rng, list: readonly T[]) => list[Math.floor(rng() * list.length)]!;

function careRng(world: World, kind: string, t: number) {
  const s = world.pet.state;
  return createRng(hashSeed(world.pet.id, kind, t, s.stats[`care_${kind}`] ?? 0));
}

function userEvent(t: number, eventId: string, text: string, importance: TimelineEvent["importance"] = "normal"): TimelineEvent {
  return { at: t, eventId, text, importance, kind: "user" };
}

function countCare(s: PetState, kind: string) {
  s.stats[`care_${kind}`] = (s.stats[`care_${kind}`] ?? 0) + 1;
}

// ---------------------------------------------------------------- ごはん

export function feed(world: World, foodId: string, t: number, ctx: CareContext): CareResult {
  const s = world.pet.state;
  const food = getFood(foodId);
  if (!food) throw new Error(`unknown food: ${foodId}`);
  if (s.stage === "egg") return { bubble: "……", reaction: "none", events: [] };
  if (isAway(s)) return AWAY;
  if (isAsleep(s)) return { bubble: "zzz…", reaction: "asleep", events: [] };
  if (s.needs.hunger < 15) return { bubble: babyize(s, "おなか いっぱい…"), reaction: "full", events: [] };

  const rng = careRng(world, "feed", t);
  const day = dayKey(t, ctx.timezone);
  countCare(s, "feed");

  // 好み + おなかの空き具合 + その日の気分で反応が決まる
  const score = foodAffinity(s.foodPrefs, food) + (s.needs.hunger - 50) / 5 + randInt(rng, -15, 15);
  const reaction: Reaction = score > 25 ? "love" : score < -25 ? "dislike" : "normal";

  // あげるほど好きになる。苦手なものも少しずつ慣れる（仕様書 10.1）
  today(s, t, ctx.timezone).tags.push(...food.tags);
  const delta = reaction === "love" ? 5 : reaction === "normal" ? 3 : 2;
  for (const tag of food.tags) s.foodPrefs[tag] = clamp((s.foodPrefs[tag] ?? 0) + delta, -100, 100);

  s.needs.hunger = clamp(s.needs.hunger - food.fullness * (reaction === "dislike" ? 0.5 : 1));
  s.needs.loneliness = clamp(s.needs.loneliness - 10);
  world.room.mess = clamp(world.room.mess + food.mess);
  if (food.mess >= 8) addCrumb(world, rng, t);

  // 世話をされると甘えん坊に、ごはんをたくさんもらうと食いしん坊に
  drift(s, "attachment", +1, day);
  if (s.needs.hunger < 30 && food.fullness >= 30) drift(s, "appetite", +1, day);

  const eatenKey = `food_${food.id}`;
  const first = !s.stats[eatenKey];
  s.stats[eatenKey] = (s.stats[eatenKey] ?? 0) + 1;

  const texts: Record<Exclude<Reaction, "full" | "asleep" | "none">, string[]> = {
    love: [`${food.name}をあげた。大好きみたい！`, `${food.name}をあげた。夢中で食べた！`],
    normal: [`${food.name}をあげた。もぐもぐ食べた。`, `${food.name}をあげた。ふつうに食べた。`],
    dislike: [`${food.name}をあげた。ちょっと苦手そう…`, `${food.name}をあげた。しぶしぶ食べた。`],
  };
  const bubbles = {
    love: ["おいしい！", "だいすき！", "もっと！"],
    normal: ["もぐもぐ", "ありがと", "ふつう"],
    dislike: ["うぇ…", "これ にがて…", "……"],
  };
  const events = [userEvent(t, `feed_${reaction}`, pick(rng, texts[reaction]))];
  if (first) events.push(userEvent(t, "first_food", `はじめて${food.name}を食べた。`, "rare"));
  return { bubble: babyize(s, pick(rng, bubbles[reaction])), reaction, events, consumed: true };
}

function addCrumb(world: World, rng: Rng, t: number) {
  if (world.room.litter.length >= 8) return;
  world.room.litter.push({ id: `l_${t}_f${world.room.litter.length}`, kind: "crumb", x: randInt(rng, 30, 86), y: randInt(rng, 92, 122) });
}

// ---------------------------------------------------------------- 掃除

/** litterIds を省略するとまとめて片付ける（掃除機）。 */
export function clean(world: World, litterIds: string[] | undefined, t: number, ctx: CareContext): CareResult {
  const s = world.pet.state;
  const room = world.room;
  const targets = litterIds ? room.litter.filter((l) => litterIds.includes(l.id)) : [...room.litter];
  if (targets.length === 0 && room.mess < 5) {
    return { bubble: "", reaction: "none", events: [] };
  }
  const rng = careRng(world, "clean", t);
  const day = dayKey(t, ctx.timezone);
  countCare(s, "clean");

  room.litter = room.litter.filter((l) => !targets.includes(l));
  room.mess = litterIds ? clamp(room.mess - targets.length * 10) : 0;
  drift(s, "tidiness", +1, day);

  const events: TimelineEvent[] = [];
  let foundFoodId: string | undefined;
  // 散らかった部屋の中から、たまに何か見つかる（仕様書 10.3）
  if (targets.length > 0 && rng() < 0.12 * targets.length) {
    const food = pick(rng, FOODS);
    foundFoodId = food.id;
    events.push(userEvent(t, "clean_found", `掃除していたら${food.name}が出てきた！`, "rare"));
  } else if (!litterIds) {
    events.push(userEvent(t, "clean", "部屋を掃除した。"));
  }

  const bubble = isAsleep(s) || isAway(s)
    ? ""
    : s.personality.tidiness > 20
      ? pick(rng, ["すっきり！", "ぴかぴか！"])
      : s.personality.tidiness < -20
        ? pick(rng, ["べつに よかったのに", "ちらかってるほうが おちつく…"])
        : pick(rng, ["ありがと", "きれいに なった"]);
  return { bubble: babyize(s, bubble), reaction: "none", events, foundFoodId };
}

// ---------------------------------------------------------------- 電気

export function setLights(world: World, on: boolean, t: number, ctx: CareContext): CareResult {
  const s = world.pet.state;
  const room = world.room;
  if (Boolean(room.lightsOff) === !on) return { bubble: "", reaction: "none", events: [] };
  if (s.stage === "departed") return AWAY;
  room.lightsOff = !on;
  const events = [userEvent(t, on ? "lights_on" : "lights_off", on ? "電気をつけた。" : "電気を消した。")];

  // 眠いときに電気を消すと、すぐ寝る（寝かしつけ）
  if (!on && !isAsleep(s) && !isAway(s) && s.stage !== "egg" && s.needs.sleepiness >= 15) {
    const sleepTime = inSleepWindow(localHour(t, ctx.timezone), s.personality);
    s.activity = sleepTime
      ? { type: "sleep", since: t, until: t + HOUR, spot: "bed" }
      : { type: "nap", since: t, until: t + HOUR, spot: "bed" };
    events.push({
      at: t,
      eventId: sleepTime ? "sleep_start" : "nap_start",
      kind: "pet",
      importance: "normal",
      text: sleepTime ? "電気が消えて、すぐにベッドに入った。" : "暗くなったので、ベッドで昼寝をはじめた。",
    });
  }
  return { bubble: "", reaction: "none", events };
}

// ---------------------------------------------------------------- 会話

/**
 * ペットに話しかける（タップ）。idle のときはペットの独り言で、状態を変えない。
 * 寝ているときに話しかけると起きる（夜に起こすと夜型に寄る）。
 */
export function talk(world: World, t: number, ctx: CareContext, idle = false): CareResult {
  const s = world.pet.state;
  const rng = createRng(hashSeed(world.pet.id, "talk", t, idle ? 1 : 0));
  if (s.stage === "egg") return { bubble: pick(rng, ["……", "（ことこと）", "（ゆらっ）"]), reaction: "none", events: [] };
  if (isAway(s)) return AWAY;

  if (isAsleep(s)) {
    if (idle) return { bubble: pick(rng, ["zzz…", "むにゃ…", "すぅ…"]), reaction: "asleep", events: [] };
    const day = dayKey(t, ctx.timezone);
    const sleepTime = inSleepWindow(localHour(t, ctx.timezone), s.personality);
    const wasType = s.activity.type;
    s.activity = { type: "idle", since: t, until: t + 20 * 60_000, spot: "rug" };
    if (sleepTime) {
      drift(s, "chronotype", +2, day);
      today(s, t, ctx.timezone).wokenAtNight = true;
    }
    countCare(s, "wake");
    return {
      bubble: babyize(s, pick(rng, ["ねむい…", "なに…？", "ふぁ…"])),
      reaction: "asleep",
      events: [
        userEvent(t, "wake", wasType === "sleep" ? "寝ているところを起こしてしまった。" : "昼寝から起こしてしまった。"),
      ],
    };
  }

  if (s.stage === "final_day") {
    // 最期の日は、昔のことを 1 つ思い出して話す（仕様書 7.3）
    const memory = (ctx.memories ?? [])[Math.floor(rng() * Math.max(1, (ctx.memories ?? []).length))];
    if (!idle) countCare(s, "talk");
    return { bubble: memory ? `…${memory}` : "……", reaction: "none", events: [] };
  }

  if (!idle) {
    countCare(s, "talk");
    s.needs.loneliness = clamp(s.needs.loneliness - 20);
    drift(s, "attachment", +1, dayKey(t, ctx.timezone));
  }
  return { bubble: babyize(s, chooseLine(world, t, ctx, rng)), reaction: "none", events: [] };
}

function chooseLine(world: World, t: number, ctx: CareContext, rng: Rng): string {
  const s = world.pet.state;
  const p = s.personality;
  const n = s.needs;
  const hour = localHour(t, ctx.timezone);
  const lines: { w: number; text: string }[] = [];
  const add = (w: number, ...texts: string[]) => texts.forEach((text) => lines.push({ w, text }));

  // おかえり
  if ((ctx.awayMs ?? 0) > 3 * HOUR) {
    if (p.attachment > 20) add(6, "おそかったね…", "まってたよ！");
    else if (p.attachment < -20) add(6, "あ、きたの", "おかえり。べつに へいきだった");
    else add(6, "おかえり！");
  }
  // 欲求
  if (n.hunger > 60) add(4, "おなか すいた…", "なにか たべたいな");
  if (n.sleepiness > 60) add(4, "ねむい…", "ふぁ〜あ");
  if (n.boredom > 60) add(3, "ひまだなあ", "あそぼ？");
  if (n.loneliness > 60) add(3, p.attachment >= 0 ? "さびしかった" : "ひとりも わるくない");
  if (world.room.mess > 50) add(2, p.tidiness >= 0 ? "へや ちらかってる…" : "このくらいが おちつく");

  // 最近のできごと
  const recent = (ctx.recent ?? []).filter((e) => e.kind === "pet" && t - e.at < 3 * HOUR);
  const had = (id: string) => recent.some((e) => e.eventId === id);
  if (had("find")) add(3, "さっき いいもの みつけたよ");
  if (had("eat")) add(3, "れいぞうこ、ちょっとだけ あけた", "ないしょで たべちゃった");
  if (had("sleep_end")) add(2, "よく ねた！");
  if (had("mess")) add(2, "ちょっと あそびすぎた");

  // 好み
  const favorite = topTag(s, 1);
  const disliked = topTag(s, -1);
  if (favorite && (s.foodPrefs[favorite] ?? 0) > 40) {
    const food = pick(rng, FOODS.filter((f) => f.tags.includes(favorite)));
    add(2, `${food.name} たべたいな`);
  }
  if (disliked && (s.foodPrefs[disliked] ?? 0) < -30) {
    const food = pick(rng, FOODS.filter((f) => f.tags.includes(disliked)));
    add(1, `${food.name}は もういい…`);
  }

  // 時間・曜日
  if (hour >= 5 && hour < 10) add(2, "おはよ！");
  if (hour >= 21 || hour < 3) add(2, "もう よるだね");
  const weekday = new Date(Date.UTC(...ymd(t, ctx.timezone))).getUTCDay();
  if (weekday === 1) add(1, "げつようびだね");
  if (weekday === 5) add(1, "もうすぐ やすみ？");

  // 性格
  if (p.energy > 30) add(1, "はしりたい！", "じっと してられない");
  if (p.energy < -30) add(1, "のんびり しよ…");
  if (p.tidiness > 30) add(1, "へや きれいに したいな");
  if (p.curiosity > 30) add(1, "そとには なにが あるんだろう");
  if (p.chronotype > 40) add(1, "よるのほうが げんき でる");
  add(1, "ふふ", "〜♪", "ねえねえ");

  const total = lines.reduce((sum, l) => sum + l.w, 0);
  let r = rng() * total;
  for (const l of lines) {
    r -= l.w;
    if (r < 0) return l.text;
  }
  return lines[lines.length - 1]!.text;
}

function ymd(t: number, tz: string): [number, number, number] {
  const p = localParts(t, tz);
  return [p.year, p.month - 1, p.day];
}

/** 好き（sign=1）・苦手（sign=-1）の一番のタグ */
export function topTag(s: PetState, sign: 1 | -1): TasteTag | undefined {
  let best: TasteTag | undefined;
  for (const tag of TASTE_TAGS) {
    if (best === undefined || sign * (s.foodPrefs[tag] ?? 0) > sign * (s.foodPrefs[best] ?? 0)) best = tag;
  }
  return best;
}

/** ベビーは片言（仕様書 10.5） */
function babyize(s: PetState, text: string): string {
  if (s.stage !== "baby" || !text) return text;
  const short = text.replace(/[、。！？…〜♪]/g, "").split(" ")[0]!.slice(0, 4);
  return short ? `${short}…！` : text;
}


// ---------------------------------------------------------------- 着せ替え

/** 着せる（itemId が null なら脱がせる）。好みで反応が変わる（仕様書 10.7） */
export function equip(world: World, slot: WearSlot, itemId: string | null, t: number, ctx: CareContext): CareResult {
  const s = world.pet.state;
  if (s.stage === "egg" || isAway(s)) return AWAY;
  if (itemId === null) {
    delete s.equipped[slot];
    return { bubble: "", reaction: "none", events: [] };
  }
  const item = getWearable(itemId);
  if (!item || item.slot !== slot) throw new Error(`invalid wearable: ${itemId}`);
  s.equipped[slot] = itemId;
  const rng = careRng(world, "equip", t);
  countCare(s, "equip");
  const affinity = wearAffinity(s.personality, innateWearTaste(world.pet.id), item);
  if (isAsleep(s)) return { bubble: "", reaction: "asleep", events: [] };
  if (affinity > 25) {
    drift(s, "attachment", +1, dayKey(t, ctx.timezone));
    return {
      bubble: babyize(s, pick(rng, ["にあう？", "これ すき！", "えへへ"])),
      reaction: "love",
      events: [userEvent(t, "equip_love", `${item.name}を着せた。とても気に入ったみたい。`)],
    };
  }
  if (affinity < -20) {
    return {
      bubble: babyize(s, pick(rng, ["これ やだ…", "うーん…", "ちょっと ちがう"])),
      reaction: "dislike",
      events: [userEvent(t, "equip_dislike", `${item.name}を着せた。あまり気に入っていないみたい…`)],
    };
  }
  return {
    bubble: babyize(s, pick(rng, ["どう？", "ふふ", "あたらしい！"])),
    reaction: "normal",
    events: [userEvent(t, "equip", `${item.name}を着せた。`)],
  };
}

// ---------------------------------------------------------------- 模様替え

export type DecorTarget = "wallpaper" | "floor" | "wall_left" | "wall_right" | "floor_left" | "floor_right";

/** 壁紙・床・家具を変える（itemId が null なら家具を片付ける）（仕様書 10.8） */
export function decorate(world: World, target: DecorTarget, itemId: string | null, t: number, _ctx: CareContext): CareResult {
  const room = world.room;
  if (target === "wallpaper") {
    if (!itemId || getWallpaper(itemId).id !== itemId) throw new Error(`invalid wallpaper: ${itemId}`);
    room.wallpaperId = itemId;
  } else if (target === "floor") {
    if (!itemId || getFloor(itemId).id !== itemId) throw new Error(`invalid floor: ${itemId}`);
    room.floorId = itemId;
  } else {
    const slot = FURNITURE_SLOTS.find((sl) => sl.id === target);
    if (!slot) throw new Error(`invalid slot: ${target}`);
    if (itemId === null) {
      delete room.furniture[target];
    } else {
      const f = getFurniture(itemId);
      if (!f || f.kind !== slot.kind) throw new Error(`invalid furniture: ${itemId}`);
      // 同じ家具はひとつだけ置ける
      for (const [k, v] of Object.entries(room.furniture)) if (v === itemId) delete room.furniture[k];
      room.furniture[target] = itemId;
    }
  }
  const s = world.pet.state;
  const rng = careRng(world, "decorate", t);
  const present = !isAway(s) && !isAsleep(s) && s.stage !== "egg";
  return {
    bubble: present ? babyize(s, pick(rng, ["わあ！", "いいね", "おへや かわった！"])) : "",
    reaction: "none",
    events: [userEvent(t, "decorate", "部屋の模様替えをした。")],
  };
}
