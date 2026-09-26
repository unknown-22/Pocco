// 一生と世代交代（仕様書 7 章）。

import { dayKey } from "./clock.ts";
import { FOODS, TASTE_TAGS } from "./foods.ts";
import { getHobby } from "./hobbies.ts";
import { RARITY_RANK, getTreasure } from "./items.ts";
import { createPet, innateFoodPrefs } from "./pet.ts";
import { createRng, hashSeed, randInt } from "./rng.ts";
import { MAX_LIFESPAN_MODIFIER_HOURS } from "./stage.ts";
import type { DailyLog, Pet, PetState, Personality, TimelineEvent } from "./types.ts";

export function emptyDay(day: string): DailyLog {
  return { day, sleptOnTime: false, wokenAtNight: false, tags: [], played: false };
}

/** その日の記録。日付が変わっていたら前日分を寿命に反映して新しくする */
export function today(s: PetState, t: number, timezone: string): DailyLog {
  const day = dayKey(t, timezone);
  if (s.today.day !== day) {
    if (s.today.day) s.lifespanModifier = clampModifier(s.lifespanModifier + evaluateDay(s.today));
    s.today = emptyDay(day);
  }
  return s.today;
}

/**
 * 1 日の暮らしぶりで寿命が少し前後する（時間単位）。
 * 食事の偏り・遊びはユーザーがあげた/遊んだ分だけを見る。放置そのものは減点しない。
 */
export function evaluateDay(d: DailyLog): number {
  let h = 0;
  if (d.sleptOnTime) h += 0.25;
  if (d.wokenAtNight) h -= 1;
  const distinct = new Set(d.tags).size;
  if (distinct >= 3) h += 0.5;
  if (d.tags.length >= 3 && distinct <= 1) h -= 0.5;
  if (d.played) h += 0.25;
  return h;
}

const clampModifier = (h: number) =>
  Math.max(-MAX_LIFESPAN_MODIFIER_HOURS, Math.min(MAX_LIFESPAN_MODIFIER_HOURS, h));

/** いちばん大事にしている物（いちばん珍しい拾い物。同じなら最初に拾った物） */
export function keepsakeOf(s: PetState): string | undefined {
  let best: string | undefined;
  for (const id of s.treasures) {
    const t = getTreasure(id);
    if (!t) continue;
    if (!best || RARITY_RANK[t.rarity] > RARITY_RANK[getTreasure(best)!.rarity]) best = id;
  }
  return best;
}

/** 最後のひとこと（仕様書 7.3）。一生で多かったことから 2〜3 行 */
export function lastWords(pet: Pet): string[] {
  const s = pet.state;
  const rng = createRng(hashSeed(pet.id, "last-words"));
  const lines: string[] = [];

  const favoriteFood = FOODS.map((f) => ({ f, n: s.stats[`food_${f.id}`] ?? 0 })).sort((a, b) => b.n - a.n)[0];
  if (favoriteFood && favoriteFood.n >= 3) lines.push(`${favoriteFood.f.name}、いっぱい くれたね`);
  if ((s.stats.eat ?? 0) >= 10) lines.push("れいぞうこ、かってに あけて ごめんね");
  const hobby = s.hobbies.map(getHobby).find(Boolean);
  if (hobby) lines.push(`${hobby.name}、たのしかった`);
  if ((s.stats.care_talk ?? 0) >= 20) lines.push("たくさん はなしかけてくれて、うれしかった");
  if ((s.stats.walk ?? 0) >= 5) lines.push("おさんぽ、たのしかったな");
  if (lines.length === 0) lines.push(rng() < 0.5 ? "いっしょに いられて よかった" : "この へや、すきだったよ");

  const picked = lines.slice(0, 2);
  picked.push("……ありがとう");
  return picked;
}

/** 旅立つ。看取られた（witnessed）かどうかで日記の書き方が変わる */
export function depart(pet: Pet, t: number, witnessed: boolean): TimelineEvent[] {
  const s = pet.state;
  pet.diedAt = t;
  s.stage = "departed";
  s.activity = { type: "departed", since: t };
  s.keepsakeItemId = keepsakeOf(s);
  s.farewell = { witnessed, lastWords: lastWords(pet), seen: false };
  const text = witnessed
    ? `${pet.name}は 最後に「ありがとう」と言って 旅立った。`
    : `${pet.name}は しずかに たびだった。`;
  return [{ at: t, eventId: "departed", kind: "pet", importance: "major", text }];
}

/** 次の世代のたまご（仕様書 7.4）。性格の 25% と、いちばん好きだった味を少し受け継ぐ */
export function inherit(parent: Pet, childId: string, t: number): Pet {
  const baseName = parent.name.replace(/\d+世$/, "");
  const generation = parent.generation + 1;
  const child = createPet({
    id: childId,
    name: `${baseName}${generation}世`.slice(0, 12),
    now: t,
    generation,
    parentId: parent.id,
  });
  const cs = child.state;
  const ps = parent.state;
  const rng = createRng(hashSeed(childId, "inherit"));
  for (const axis of Object.keys(cs.personality) as (keyof Personality)[]) {
    cs.personality[axis] = Math.round(ps.personality[axis] * 0.25) + randInt(rng, -8, 8);
  }
  cs.foodPrefs = innateFoodPrefs(childId);
  const favorite = TASTE_TAGS.reduce((a, b) => ((ps.foodPrefs[a] ?? 0) >= (ps.foodPrefs[b] ?? 0) ? a : b));
  cs.foodPrefs[favorite] = Math.min(100, (cs.foodPrefs[favorite] ?? 0) + 20);
  cs.inheritedHobbies = [...ps.hobbies];
  return child;
}

