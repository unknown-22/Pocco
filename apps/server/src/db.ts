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
