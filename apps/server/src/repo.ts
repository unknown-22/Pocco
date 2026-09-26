// DB の読み書き。状態の構造は state_json に入れる。

import { randomUUID } from "node:crypto";
import { createPet, createRoom, type Pet, type RoomState } from "@pocco/sim";
import type { DB } from "./db.ts";

export interface Meta {
  timezone: string;
  currentPetId: string | null;
  lastSimulatedAt: number;
  lastInteractedAt: number;
}

interface PetRow {
  id: string;
  generation: number;
  parent_id: string | null;
  name: string;
  born_at: number;
  died_at: number | null;
  state_json: string;
}

export function getMeta(db: DB): Meta | null {
  const row = db.prepare("SELECT * FROM meta WHERE id = 1").get() as
    | { timezone: string; current_pet_id: string | null; last_simulated_at: number; last_interacted_at: number }
    | undefined;
  if (!row) return null;
  return {
    timezone: row.timezone,
    currentPetId: row.current_pet_id,
    lastSimulatedAt: row.last_simulated_at,
    lastInteractedAt: row.last_interacted_at,
  };
}

export function saveMeta(db: DB, meta: Meta) {
  db.prepare(
    `INSERT INTO meta (id, timezone, current_pet_id, last_simulated_at, last_interacted_at)
     VALUES (1, @timezone, @currentPetId, @lastSimulatedAt, @lastInteractedAt)
     ON CONFLICT(id) DO UPDATE SET timezone = excluded.timezone,
       current_pet_id = excluded.current_pet_id,
       last_simulated_at = excluded.last_simulated_at,
       last_interacted_at = excluded.last_interacted_at`,
  ).run(meta);
}

export function getPet(db: DB, id: string): Pet | null {
  const row = db.prepare("SELECT * FROM pets WHERE id = ?").get(id) as PetRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    generation: row.generation,
    parentId: row.parent_id,
    name: row.name,
    bornAt: row.born_at,
    diedAt: row.died_at,
    state: JSON.parse(row.state_json),
  };
}

export function savePet(db: DB, pet: Pet) {
  db.prepare(
    `INSERT INTO pets (id, generation, parent_id, name, born_at, died_at, state_json)
     VALUES (@id, @generation, @parentId, @name, @bornAt, @diedAt, @stateJson)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, died_at = excluded.died_at,
       state_json = excluded.state_json`,
  ).run({ ...pet, stateJson: JSON.stringify(pet.state) });
}

export function getRoom(db: DB): RoomState {
  const row = db.prepare("SELECT state_json FROM room WHERE id = 1").get() as
    | { state_json: string }
    | undefined;
  return row ? JSON.parse(row.state_json) : createRoom();
}

export function saveRoom(db: DB, room: RoomState) {
  db.prepare(
    `INSERT INTO room (id, state_json) VALUES (1, ?)
     ON CONFLICT(id) DO UPDATE SET state_json = excluded.state_json`,
  ).run(JSON.stringify(room));
}

/** 初回起動時に最初のたまごと部屋を用意する。 */
export function ensureInitialized(db: DB, now: number): Meta {
  const existing = getMeta(db);
  if (existing) return existing;
  const pet = createPet({ id: randomUUID(), name: "ポッコ", now });
  const meta: Meta = {
    timezone: "Asia/Tokyo",
    currentPetId: pet.id,
    lastSimulatedAt: now,
    lastInteractedAt: now,
  };
  db.transaction(() => {
    savePet(db, pet);
    saveRoom(db, createRoom());
    saveMeta(db, meta);
  })();
  return meta;
}

/** 同じ操作の二重処理を防ぐ。初めてなら true。 */
export function markActionProcessed(db: DB, clientActionId: string, now: number): boolean {
  const res = db
    .prepare("INSERT OR IGNORE INTO processed_actions (client_action_id, processed_at) VALUES (?, ?)")
    .run(clientActionId, now);
  return res.changes > 0;
}
