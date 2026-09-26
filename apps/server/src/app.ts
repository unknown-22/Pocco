// API（仕様書 12 章）。P0 では状態の取得と名前変更のみ。

import { Hono } from "hono";
import { stageForAge } from "@pocco/sim";
import type { DB } from "./db.ts";
import {
  ensureInitialized,
  getPet,
  getRoom,
  markActionProcessed,
  saveMeta,
  savePet,
} from "./repo.ts";

export type Clock = () => number;

type Action = { type: "rename"; name: string };

export function createApp(db: DB, clock: Clock = Date.now) {
  const app = new Hono();

  function loadState() {
    const now = clock();
    const meta = ensureInitialized(db, now);
    const pet = meta.currentPetId ? getPet(db, meta.currentPetId) : null;
    if (pet) {
      // P1 でシミュレーションエンジンのキャッチアップに置き換える
      const stage = stageForAge(now - pet.bornAt);
      if (stage !== pet.state.stage) {
        pet.state.stage = stage;
        pet.state.speciesId = stage;
        savePet(db, pet);
      }
    }
    return { now, meta, pet, room: getRoom(db) };
  }

  app.get("/api/health", (c) => c.json({ ok: true }));

  app.get("/api/state", (c) => {
    const { now, meta, pet, room } = loadState();
    return c.json({ serverNow: now, timezone: meta.timezone, pet, room });
  });

  app.post("/api/actions", async (c) => {
    const body = (await c.req.json().catch(() => null)) as
      | { clientActionId?: unknown; action?: Action }
      | null;
    if (!body || typeof body.clientActionId !== "string" || !body.action) {
      return c.json({ error: "invalid_request" }, 400);
    }
    const { now, meta, pet } = loadState();
    if (!pet) return c.json({ error: "no_pet" }, 409);

    const action = body.action;
    if (action.type === "rename") {
      const name = typeof action.name === "string" ? action.name.trim() : "";
      if (name.length < 1 || name.length > 12) {
        return c.json({ error: "invalid_name" }, 400);
      }
      db.transaction(() => {
        if (!markActionProcessed(db, body.clientActionId as string, now)) return;
        pet.name = name;
        savePet(db, pet);
        saveMeta(db, { ...meta, lastInteractedAt: now });
      })();
    } else {
      return c.json({ error: "unknown_action" }, 400);
    }

    const { pet: updated, room } = loadState();
    return c.json({ serverNow: now, timezone: meta.timezone, pet: updated, room });
  });

  return app;
}
