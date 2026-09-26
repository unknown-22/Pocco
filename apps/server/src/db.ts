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
