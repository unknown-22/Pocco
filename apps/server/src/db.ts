// SQLite の初期化とマイグレーション（仕様書 13.1）。
// テーブルは使うフェーズで順次追加する。

import Database from "better-sqlite3";

export type DB = Database.Database;

const MIGRATIONS: string[] = [
  // v1: P0
  `
  CREATE TABLE meta (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    timezone TEXT NOT NULL,
    current_pet_id TEXT,
    last_simulated_at INTEGER NOT NULL,
    last_interacted_at INTEGER NOT NULL
  );
  CREATE TABLE pets (
    id TEXT PRIMARY KEY,
    generation INTEGER NOT NULL,
    parent_id TEXT,
    name TEXT NOT NULL,
    born_at INTEGER NOT NULL,
    died_at INTEGER,
    state_json TEXT NOT NULL
  );
  CREATE TABLE room (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    state_json TEXT NOT NULL
  );
  CREATE TABLE processed_actions (
    client_action_id TEXT PRIMARY KEY,
    processed_at INTEGER NOT NULL
  );
  `,
  // v2: P1 タイムライン
  `
  ALTER TABLE meta ADD COLUMN last_seen_at INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE meta ADD COLUMN absence_from INTEGER;
  ALTER TABLE meta ADD COLUMN absence_to INTEGER;
  UPDATE meta SET last_seen_at = last_interacted_at;
  CREATE TABLE timeline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id TEXT NOT NULL,
    at INTEGER NOT NULL,
    end_at INTEGER,
    day_key TEXT NOT NULL,
    event_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    text TEXT NOT NULL,
    importance TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0,
    refs_json TEXT
  );
  CREATE INDEX timeline_pet_at ON timeline (pet_id, at);
  CREATE INDEX timeline_day ON timeline (pet_id, day_key);
  `,
  // v3: P2 もちもの・おすそわけ
  `
  CREATE TABLE inventory (
    item_id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    count INTEGER NOT NULL,
    acquired_at INTEGER NOT NULL
  );
  ALTER TABLE meta ADD COLUMN last_gift_day TEXT;
  -- 既存のセーブデータにも最初の食べ物を配る
  INSERT INTO inventory (item_id, kind, count, acquired_at)
    SELECT v.id, 'food', v.n, 0 FROM (
      SELECT 'apple' AS id, 3 AS n UNION ALL SELECT 'rice_ball', 3
      UNION ALL SELECT 'bread', 2 UNION ALL SELECT 'cookie', 2
    ) v WHERE EXISTS (SELECT 1 FROM meta);
  `,
  // v4: P3 図鑑・世代交代
  `
  CREATE TABLE collection (
    category TEXT NOT NULL,
    entry_id TEXT NOT NULL,
    first_at INTEGER NOT NULL,
    PRIMARY KEY (category, entry_id)
  );
  ALTER TABLE meta ADD COLUMN next_egg_at INTEGER;
  `,
  // v5: P4 写真・模様替え
  `
  CREATE TABLE photos (
    id TEXT PRIMARY KEY,
    pet_id TEXT NOT NULL,
    taken_at INTEGER NOT NULL,
    caption TEXT NOT NULL,
    file TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'snap'
  );
  CREATE INDEX photos_pet ON photos (pet_id, taken_at);
  INSERT OR IGNORE INTO inventory (item_id, kind, count, acquired_at)
    SELECT v.id, v.kind, 1, 0 FROM (
      SELECT 'wall_cream' AS id, 'wallpaper' AS kind UNION ALL SELECT 'floor_wood', 'floor'
      UNION ALL SELECT 'plant_pot', 'furniture' UNION ALL SELECT 'straw_hat', 'wear'
    ) v WHERE EXISTS (SELECT 1 FROM meta);
  `,
];

export function openDb(file: string): DB {
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: DB) {
  const current = db.pragma("user_version", { simple: true }) as number;
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v]!);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }
}
