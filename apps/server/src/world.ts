// 保存されている世界を現在時刻まで進める（仕様書 4.1）。
// リクエスト時とサーバーの定期実行の両方から呼ばれる。
// 旅立ちの翌朝には次の世代のたまごを用意する（仕様書 7.3〜7.4）。

import { randomUUID } from "node:crypto";
import {
  HOUR,
  MINUTE,
  getTreasure,
  inherit,
  localParts,
  simulate,
  type Pet,
  type RoomState,
} from "@pocco/sim";
import type { DB } from "./db.ts";
import { grantRewards } from "./rewards.ts";
import {
  addItem,
  ensureInitialized,
  getPet,
  getRoom,
  insertEvents,
  recordDiscovery,
  saveMeta,
  savePet,
  saveRoom,
  type Meta,
} from "./repo.ts";

export interface Loaded {
  meta: Meta;
  pet: Pet;
  room: RoomState;
}

/** たまごが現れるのは、旅立ちの翌朝 6:00（2 時間もないときは、その次の朝） */
const EGG_HOUR = 6;
const MIN_WAIT_MS = 2 * HOUR;

export function nextEggTime(diedAt: number, timezone: string): number {
  const step = 10 * MINUTE;
  let t = Math.ceil((diedAt + MIN_WAIT_MS) / step) * step;
  for (let i = 0; i < 400; i++, t += step) {
    const p = localParts(t, timezone);
    if (p.hour === EGG_HOUR && p.minute < 10) return t;
  }
  return diedAt + 24 * HOUR;
}

export function advance(db: DB, now: number): Loaded {
  return db.transaction((): Loaded => {
    let meta = ensureInitialized(db, now);
    let pet = getPet(db, meta.currentPetId!);
    if (!pet) throw new Error("current pet not found");
    let room = getRoom(db);

    for (;;) {
      const r = simulate({ pet, room, lastSimulatedAt: meta.lastSimulatedAt }, now, {
        timezone: meta.timezone,
        sleepStartMinutes: meta.sleepStartMinutes,
        lastSeenAt: meta.lastSeenAt,
      });
      if (r.world.lastSimulatedAt !== meta.lastSimulatedAt) {
        pet = r.world.pet;
        room = r.world.room;
        meta = { ...meta, lastSimulatedAt: r.world.lastSimulatedAt };
        savePet(db, pet);
        saveRoom(db, room);
        insertEvents(db, pet.id, meta.timezone, r.events);
        for (const g of r.gains) addItem(db, g.itemId, g.kind, 1, g.at);
        for (const d of r.discoveries) recordDiscovery(db, d.category, d.entryId, d.at);
      }

      if (pet.diedAt === null) break;
      if (meta.nextEggAt === null) meta = { ...meta, nextEggAt: nextEggTime(pet.diedAt, meta.timezone) };
      if (now < meta.nextEggAt!) break;

      // 次の世代（仕様書 7.4）
      const eggAt = meta.nextEggAt!;
      const child = inherit(pet, randomUUID(), eggAt);
      const keepsake = getTreasure(pet.state.keepsakeItemId ?? "");
      room = { ...room, keepsakeItemId: keepsake?.id };
      savePet(db, child);
      saveRoom(db, room);
      insertEvents(db, child.id, meta.timezone, [
        {
          at: eggAt,
          eventId: "new_egg",
          kind: "pet",
          importance: "major",
          text: keepsake
            ? `窓ぎわに、${keepsake.name}と ならんで あたらしい たまごが あった。`
            : "窓ぎわに、あたらしい たまごが あった。",
        },
      ]);
      recordDiscovery(db, "species", "egg", eggAt);
      pet = child;
      meta = { ...meta, currentPetId: child.id, lastSimulatedAt: eggAt, nextEggAt: null };
    }
    saveMeta(db, meta);
    grantRewards(db, now);
    return { meta, pet, room };
  })();
}
