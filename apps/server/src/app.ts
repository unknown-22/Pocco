// API（仕様書 12 章）。

import { Hono } from "hono";
import { ABSENT_AFTER_MS } from "@pocco/sim";
import type { DB } from "./db.ts";
import {
  insertEvents,
  listTimeline,
  markActionProcessed,
  markRead,
  saveMeta,
  savePet,
  unreadCount,
} from "./repo.ts";
import { advance, type Loaded } from "./world.ts";

export type Clock = () => number;

export interface AppOptions {
  clock?: Clock;
  /** 開発用の時間早送り。指定したときだけ /api/debug/* が使える */
  debug?: { advance: (ms: number) => void };
}

type Action = { type: "rename"; name: string };

const MAX_DEBUG_ADVANCE = 30 * 24 * 60 * 60 * 1000;

export function createApp(db: DB, opts: AppOptions = {}) {
  const clock = opts.clock ?? Date.now;
  const app = new Hono();

  const view = (now: number, { meta, pet, room }: Loaded) => ({
    serverNow: now,
    timezone: meta.timezone,
    pet,
    room,
    unread: unreadCount(db, pet.id),
    absence: meta.absence,
    debug: Boolean(opts.debug),
  });

  app.get("/api/health", (c) => c.json({ ok: true }));

  // アプリを開いている間は定期的に呼ばれる。「見ていた時刻」もここで記録する
  app.get("/api/state", (c) => {
    const now = clock();
    const loaded = advance(db, now);
    const { meta } = loaded;
    const absence =
      now - meta.lastSeenAt > ABSENT_AFTER_MS ? { from: meta.lastSeenAt, to: now } : meta.absence;
    const next = { ...meta, lastSeenAt: now, absence };
    saveMeta(db, next);
    return c.json(view(now, { ...loaded, meta: next }));
  });

  app.get("/api/timeline", (c) => {
    const { pet } = advance(db, clock());
    const num = (v: string | undefined) => (v === undefined || v === "" ? undefined : Number(v));
    const limit = Math.min(100, Math.max(1, num(c.req.query("limit")) ?? 50));
    const entries = listTimeline(db, pet.id, {
      beforeAt: num(c.req.query("beforeAt")),
      beforeId: num(c.req.query("beforeId")),
      limit,
    });
    return c.json({ entries, hasMore: entries.length === limit });
  });

  app.post("/api/timeline/read", async (c) => {
    const body = (await c.req.json().catch(() => null)) as { upToId?: unknown } | null;
    if (!body || typeof body.upToId !== "number") return c.json({ error: "invalid_request" }, 400);
    const { pet } = advance(db, clock());
    markRead(db, pet.id, body.upToId);
    return c.json({ unread: unreadCount(db, pet.id) });
  });

  app.post("/api/actions", async (c) => {
    const body = (await c.req.json().catch(() => null)) as
      | { clientActionId?: unknown; action?: Action }
      | null;
    if (!body || typeof body.clientActionId !== "string" || !body.action) {
      return c.json({ error: "invalid_request" }, 400);
    }
    const now = clock();
    const loaded = advance(db, now);
    const { meta, pet } = loaded;
    const clientActionId = body.clientActionId;

    const action = body.action;
    if (action.type === "rename") {
      const name = typeof action.name === "string" ? action.name.trim() : "";
      if (name.length < 1 || name.length > 12) {
        return c.json({ error: "invalid_name" }, 400);
      }
      db.transaction(() => {
        if (!markActionProcessed(db, clientActionId, now)) return;
        pet.name = name;
        savePet(db, pet);
        saveMeta(db, { ...meta, lastInteractedAt: now, lastSeenAt: now });
        insertEvents(db, pet.id, meta.timezone, [
          { at: now, eventId: "rename", kind: "user", importance: "normal", text: `なまえが「${name}」になった。` },
        ]);
      })();
    } else {
      return c.json({ error: "unknown_action" }, 400);
    }

    return c.json(view(now, advance(db, now)));
  });

  if (opts.debug) {
    const debug = opts.debug;
    app.post("/api/debug/advance", async (c) => {
      const body = (await c.req.json().catch(() => null)) as { minutes?: unknown } | null;
      const minutes = Number(body?.minutes);
      const ms = minutes * 60_000;
      if (!Number.isFinite(ms) || ms <= 0 || ms > MAX_DEBUG_ADVANCE) {
        return c.json({ error: "invalid_minutes" }, 400);
      }
      debug.advance(ms);
      const now = clock();
      return c.json(view(now, advance(db, now)));
    });
  }

  return app;
}
