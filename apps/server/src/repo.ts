// DB の読み書き。状態の構造は state_json に入れる。

import { randomUUID } from "node:crypto";
import {
  createPet,
  createRoom,
  dayKey,
  normalizePet,
  STARTER_FOODS,
  STARTER_DECOR,
  eventEntryOf,
  type Pet,
  type RoomState,
  type TimelineEvent,
} from "@pocco/sim";
import type { DB } from "./db.ts";

export interface Meta {
  timezone: string;
  currentPetId: string | null;
  lastSimulatedAt: number;
  lastInteractedAt: number;
  /** 最後にアプリが開かれていた時刻 */
  lastSeenAt: number;
  /** 直近の留守の期間（留守中サマリー用）。read はその留守の日記を読んだか */
  absence: { from: number; to: number; read: boolean } | null;
  /** 最後におすそわけが届いた日（YYYY-MM-DD） */
  lastGiftDay: string | null;
  /** 次の世代のたまごが現れる時刻（旅立ちの翌朝 6:00） */
  nextEggAt: number | null;
}

interface MetaRow {
  timezone: string;
  current_pet_id: string | null;
  last_simulated_at: number;
  last_interacted_at: number;
  last_seen_at: number;
  absence_from: number | null;
  absence_to: number | null;
  absence_read: number;
  last_gift_day: string | null;
  next_egg_at: number | null;
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

export interface TimelineEntry extends TimelineEvent {
  id: number;
  read: boolean;
}

interface TimelineRow {
  id: number;
  at: number;
  end_at: number | null;
  event_id: string;
  kind: "pet" | "user";
  text: string;
  importance: TimelineEvent["importance"];
  read: number;
}

export function getMeta(db: DB): Meta | null {
  const row = db.prepare("SELECT * FROM meta WHERE id = 1").get() as MetaRow | undefined;
  if (!row) return null;
  return {
    timezone: row.timezone,
    currentPetId: row.current_pet_id,
    lastSimulatedAt: row.last_simulated_at,
    lastInteractedAt: row.last_interacted_at,
    lastSeenAt: row.last_seen_at,
    absence:
      row.absence_from !== null && row.absence_to !== null
        ? { from: row.absence_from, to: row.absence_to, read: row.absence_read === 1 }
        : null,
    lastGiftDay: row.last_gift_day,
    nextEggAt: row.next_egg_at,
  };
}

export function saveMeta(db: DB, meta: Meta) {
  db.prepare(
    `INSERT INTO meta (id, timezone, current_pet_id, last_simulated_at, last_interacted_at,
       last_seen_at, absence_from, absence_to, absence_read, last_gift_day, next_egg_at)
     VALUES (1, @timezone, @currentPetId, @lastSimulatedAt, @lastInteractedAt,
       @lastSeenAt, @absenceFrom, @absenceTo, @absenceRead, @lastGiftDay, @nextEggAt)
     ON CONFLICT(id) DO UPDATE SET timezone = excluded.timezone,
       current_pet_id = excluded.current_pet_id,
       last_simulated_at = excluded.last_simulated_at,
       last_interacted_at = excluded.last_interacted_at,
       last_seen_at = excluded.last_seen_at,
       absence_from = excluded.absence_from,
       absence_to = excluded.absence_to,
       absence_read = excluded.absence_read,
       last_gift_day = excluded.last_gift_day,
       next_egg_at = excluded.next_egg_at`,
  ).run({
    timezone: meta.timezone,
    currentPetId: meta.currentPetId,
    lastSimulatedAt: meta.lastSimulatedAt,
    lastInteractedAt: meta.lastInteractedAt,
    lastSeenAt: meta.lastSeenAt,
    absenceFrom: meta.absence?.from ?? null,
    absenceTo: meta.absence?.to ?? null,
    absenceRead: meta.absence?.read ? 1 : 0,
    lastGiftDay: meta.lastGiftDay,
    nextEggAt: meta.nextEggAt,
  });
}

export function getPet(db: DB, id: string): Pet | null {
  const row = db.prepare("SELECT * FROM pets WHERE id = ?").get(id) as PetRow | undefined;
  if (!row) return null;
  return normalizePet({
    id: row.id,
    generation: row.generation,
    parentId: row.parent_id,
    name: row.name,
    bornAt: row.born_at,
    diedAt: row.died_at,
    state: JSON.parse(row.state_json),
  });
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
    lastSeenAt: now,
    absence: null,
    lastGiftDay: null,
    nextEggAt: null,
  };
  db.transaction(() => {
    savePet(db, pet);
    recordDiscovery(db, "species", "egg", now);
    saveRoom(db, createRoom());
    saveMeta(db, meta);
    for (const [id, count] of Object.entries(STARTER_FOODS)) addItem(db, id, "food", count, now);
    for (const d of STARTER_DECOR) addItem(db, d.itemId, d.kind, 1, now);
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

/** 1 日に残す「普通」の出来事の上限（仕様書 9.2） */
export const DAILY_NORMAL_LIMIT = 30;

/** 日記に書き込む。普通の出来事は 1 日の上限を超えたら捨てる。 */
export function insertEvents(db: DB, petId: string, timezone: string, events: TimelineEvent[]) {
  const count = db.prepare(
    `SELECT COUNT(*) AS n FROM timeline
     WHERE pet_id = ? AND day_key = ? AND importance = 'normal' AND kind = 'pet'`,
  );
  const insert = db.prepare(
    `INSERT INTO timeline (pet_id, at, end_at, day_key, event_id, kind, text, importance)
     VALUES (@petId, @at, @endAt, @dayKey, @eventId, @kind, @text, @importance)`,
  );
  for (const e of events) {
    const day = dayKey(e.at, timezone);
    if (e.kind === "pet" && e.importance === "normal") {
      const { n } = count.get(petId, day) as { n: number };
      if (n >= DAILY_NORMAL_LIMIT) continue;
    }
    // 図鑑のイベントにあたる出来事は記録する
    const entry = eventEntryOf(e);
    if (entry) recordDiscovery(db, "event", entry, e.at);
    insert.run({
      petId,
      at: e.at,
      endAt: e.endAt ?? null,
      dayKey: day,
      eventId: e.eventId,
      kind: e.kind,
      text: e.text,
      importance: e.importance,
    });
  }
}

/** 新しい順に日記を返す。before は (at, id) のカーソル。 */
export function listTimeline(
  db: DB,
  petId: string,
  opts: { beforeAt?: number; beforeId?: number; limit: number },
): TimelineEntry[] {
  const rows = db
    .prepare(
      `SELECT * FROM timeline WHERE pet_id = @petId
         AND (@beforeAt IS NULL OR at < @beforeAt OR (at = @beforeAt AND id < @beforeId))
       ORDER BY at DESC, id DESC LIMIT @limit`,
    )
    .all({
      petId,
      beforeAt: opts.beforeAt ?? null,
      beforeId: opts.beforeId ?? 0,
      limit: opts.limit,
    }) as TimelineRow[];
  return rows.map(toEntry);
}

function toEntry(r: TimelineRow): TimelineEntry {
  return {
    id: r.id,
    at: r.at,
    ...(r.end_at !== null ? { endAt: r.end_at } : {}),
    eventId: r.event_id,
    kind: r.kind,
    text: r.text,
    importance: r.importance,
    read: r.read === 1,
  };
}

export function unreadCount(db: DB, petId: string): number {
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM timeline WHERE pet_id = ? AND read = 0")
    .get(petId) as { n: number };
  return row.n;
}

/** upToId 以下を既読にする（スマホで読んだものは PC でも既読）。 */
export function markRead(db: DB, petId: string, upToId: number) {
  db.prepare("UPDATE timeline SET read = 1 WHERE pet_id = ? AND id <= ? AND read = 0").run(petId, upToId);
}

// ---------------------------------------------------------------- もちもの

export interface InventoryItem {
  itemId: string;
  kind: string;
  count: number;
}

export function getInventory(db: DB): InventoryItem[] {
  const rows = db
    .prepare("SELECT item_id, kind, count FROM inventory WHERE count > 0 ORDER BY acquired_at, item_id")
    .all() as { item_id: string; kind: string; count: number }[];
  return rows.map((r) => ({ itemId: r.item_id, kind: r.kind, count: r.count }));
}

export function addItem(db: DB, itemId: string, kind: string, count: number, now: number) {
  db.prepare(
    `INSERT INTO inventory (item_id, kind, count, acquired_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(item_id) DO UPDATE SET count = count + excluded.count`,
  ).run(itemId, kind, count, now);
}

/** その種類の物を持っているか（着せ替え・家具など、使っても減らない物） */
export function owns(db: DB, itemId: string, kind: string): boolean {
  const row = db.prepare("SELECT count FROM inventory WHERE item_id = ? AND kind = ?").get(itemId, kind) as
    | { count: number }
    | undefined;
  return (row?.count ?? 0) > 0;
}

/** 1 つ使う。持っていなければ false。 */
export function useItem(db: DB, itemId: string): boolean {
  const res = db.prepare("UPDATE inventory SET count = count - 1 WHERE item_id = ? AND count > 0").run(itemId);
  return res.changes > 0;
}

export function hasItem(db: DB, itemId: string): boolean {
  const row = db.prepare("SELECT count FROM inventory WHERE item_id = ?").get(itemId) as { count: number } | undefined;
  return (row?.count ?? 0) > 0;
}

// ---------------------------------------------------------------- 図鑑・思い出

export function recordDiscovery(db: DB, category: string, entryId: string, at: number): boolean {
  const res = db
    .prepare("INSERT OR IGNORE INTO collection (category, entry_id, first_at) VALUES (?, ?, ?)")
    .run(category, entryId, at);
  return res.changes > 0;
}

export function getCollection(db: DB): { category: string; entryId: string; firstAt: number }[] {
  const rows = db.prepare("SELECT category, entry_id, first_at FROM collection ORDER BY first_at").all() as {
    category: string;
    entry_id: string;
    first_at: number;
  }[];
  return rows.map((r) => ({ category: r.category, entryId: r.entry_id, firstAt: r.first_at }));
}

export function listPets(db: DB): Pet[] {
  const ids = db.prepare("SELECT id FROM pets ORDER BY generation").all() as { id: string }[];
  return ids.map((r) => getPet(db, r.id)!);
}

/** 大事なできごと（進化・趣味・レアな拾い物など）を古い順に */
export function listHighlights(db: DB, petId: string, limit: number): TimelineEntry[] {
  const rows = db
    .prepare(
      `SELECT * FROM timeline WHERE pet_id = ? AND importance != 'normal'
       ORDER BY at, id LIMIT ?`,
    )
    .all(petId, limit) as TimelineRow[];
  return rows.map(toEntry);
}

// ---------------------------------------------------------------- 写真

export interface Photo {
  id: string;
  petId: string;
  takenAt: number;
  caption: string;
  file: string;
  kind: string;
}

export function insertPhoto(db: DB, p: Photo) {
  db.prepare(
    "INSERT INTO photos (id, pet_id, taken_at, caption, file, kind) VALUES (@id, @petId, @takenAt, @caption, @file, @kind)",
  ).run(p);
}

export function listPhotos(db: DB, petId?: string): Photo[] {
  const rows = (
    petId
      ? db.prepare("SELECT * FROM photos WHERE pet_id = ? ORDER BY taken_at DESC").all(petId)
      : db.prepare("SELECT * FROM photos ORDER BY taken_at DESC").all()
  ) as { id: string; pet_id: string; taken_at: number; caption: string; file: string; kind: string }[];
  return rows.map((r) => ({ id: r.id, petId: r.pet_id, takenAt: r.taken_at, caption: r.caption, file: r.file, kind: r.kind }));
}

export function getPhoto(db: DB, id: string): Photo | undefined {
  return listPhotos(db).find((p) => p.id === id);
}

export function deletePhoto(db: DB, id: string) {
  db.prepare("DELETE FROM photos WHERE id = ?").run(id);
}

export function hasPhotoOfKind(db: DB, petId: string, kind: string): boolean {
  return Boolean(db.prepare("SELECT 1 FROM photos WHERE pet_id = ? AND kind = ?").get(petId, kind));
}
