// 1 日 1 回の「おすそわけ」（仕様書 10.1）。その日はじめて開いたときに食べ物が届く。

import { FOODS, createRng, dayKey, hashSeed } from "@pocco/sim";
import type { DB } from "./db.ts";
import { addItem, insertEvents, saveMeta, type Meta } from "./repo.ts";

export const GIFT_COUNT = 3;

export function deliverDailyGift(db: DB, meta: Meta, petId: string, now: number): Meta {
  const today = dayKey(now, meta.timezone);
  if (meta.lastGiftDay === today) return meta;

  const rng = createRng(hashSeed(petId, "gift", today));
  const picked = Array.from({ length: GIFT_COUNT }, () => FOODS[Math.floor(rng() * FOODS.length)]!);
  for (const food of picked) addItem(db, food.id, "food", 1, now);
  insertEvents(db, petId, meta.timezone, [
    {
      at: now,
      eventId: "gift",
      kind: "user",
      importance: "normal",
      text: `おすそわけで ${picked.map((f) => f.name).join("・")} が届いた。`,
    },
  ]);
  const next = { ...meta, lastGiftDay: today };
  saveMeta(db, next);
  return next;
}
