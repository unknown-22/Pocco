// 保存されている世界を現在時刻まで進める（仕様書 4.1）。
// リクエスト時とサーバーの定期実行の両方から呼ばれる。

import { simulate, type Pet, type RoomState } from "@pocco/sim";
import type { DB } from "./db.ts";
import {
  ensureInitialized,
  getPet,
  getRoom,
  insertEvents,
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

export function advance(db: DB, now: number): Loaded {
  return db.transaction((): Loaded => {
    const meta = ensureInitialized(db, now);
    const pet = getPet(db, meta.currentPetId!);
    if (!pet) throw new Error("current pet not found");
    const room = getRoom(db);

    const { world, events } = simulate(
      { pet, room, lastSimulatedAt: meta.lastSimulatedAt },
      now,
      { timezone: meta.timezone, lastSeenAt: meta.lastSeenAt },
    );
    if (world.lastSimulatedAt === meta.lastSimulatedAt) return { meta, pet, room };

    const next = { ...meta, lastSimulatedAt: world.lastSimulatedAt };
    savePet(db, world.pet);
    saveRoom(db, world.room);
    saveMeta(db, next);
    insertEvents(db, pet.id, meta.timezone, events);
    return { meta: next, pet: world.pet, room: world.room };
  })();
}
