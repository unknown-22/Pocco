// API（仕様書 12 章）。

import { Hono } from "hono";
import {
  ABSENT_AFTER_MS,
  clean,
  feed,
  getFood,
  setLights,
  talk,
  type CareContext,
  type CareResult,
  type World,
} from "@pocco/sim";
import type { DB } from "./db.ts";
import { deliverDailyGift } from "./gifts.ts";
import {
  addItem,
  getInventory,
  hasItem,
  insertEvents,
  listTimeline,
  markActionProcessed,
  markRead,
  saveMeta,
  savePet,
  saveRoom,
  unreadCount,
  useItem,
} from "./repo.ts";
import { advance, type Loaded } from "./world.ts";

export type Clock = () => number;

export interface AppOptions {
  clock?: Clock;
  /** 開発用の時間早送り。指定したときだけ /api/debug/* が使える */
  debug?: { advance: (ms: number) => void };
}

export type Action =
  | { type: "rename"; name: string }
  | { type: "feed"; foodId: string }
  | { type: "clean"; litterIds?: string[] }
  | { type: "talk"; idle?: boolean }
  | { type: "lights"; on: boolean };

const MAX_DEBUG_ADVANCE = 30 * 24 * 60 * 60 * 1000;
/** これより前に終わった留守は「おかえり」の対象にしない */
const GREETING_WINDOW_MS = 10 * 60_000;

class BadRequest extends Error {}

export function createApp(db: DB, opts: AppOptions = {}) {
  const clock = opts.clock ?? Date.now;
  const app = new Hono();

  const view = (now: number, { meta, pet, room }: Loaded, reaction?: Pick<CareResult, "bubble" | "reaction">) => ({
    serverNow: now,
    timezone: meta.timezone,
    pet,
    room,
    inventory: getInventory(db),
    unread: unreadCount(db, pet.id),
    absence: meta.absence,
    debug: Boolean(opts.debug),
    ...(reaction ? { reaction } : {}),
  });

  app.onError((err, c) => {
    if (err instanceof BadRequest) return c.json({ error: err.message }, 400);
    console.error(err);
    return c.json({ error: "internal_error" }, 500);
  });

  app.get("/api/health", (c) => c.json({ ok: true }));

  // アプリを開いている間は定期的に呼ばれる。「見ていた時刻」もここで記録する
  app.get("/api/state", (c) => {
    const now = clock();
    const loaded = advance(db, now);
    const result = db.transaction(() => {
      const { meta } = loaded;
      const absence =
        now - meta.lastSeenAt > ABSENT_AFTER_MS ? { from: meta.lastSeenAt, to: now } : meta.absence;
      let next = { ...meta, lastSeenAt: now, absence };
      saveMeta(db, next);
      next = deliverDailyGift(db, next, loaded.pet.id, now);
      return { ...loaded, meta: next };
    })();
    return c.json(view(now, result));
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
    if (!body || typeof body.clientActionId !== "string" || !body.action || typeof body.action !== "object") {
      return c.json({ error: "invalid_request" }, 400);
    }
    const now = clock();
    const clientActionId = body.clientActionId;
    const action = body.action;

    const reaction = db.transaction((): CareResult | undefined => {
      const loaded = advance(db, now);
      const { meta, pet, room } = loaded;
      const idleTalk = action.type === "talk" && action.idle === true;
      if (!idleTalk && !markActionProcessed(db, clientActionId, now)) return undefined;

      const world: World = { pet, room, lastSimulatedAt: meta.lastSimulatedAt };
      const recentAbsence =
        meta.absence && now - meta.absence.to < GREETING_WINDOW_MS ? meta.absence.to - meta.absence.from : 0;
      const ctx: CareContext = {
        timezone: meta.timezone,
        awayMs: recentAbsence,
        recent: listTimeline(db, pet.id, { limit: 10 }),
      };
      const result = runAction(action, world, now, ctx);

      savePet(db, world.pet);
      saveRoom(db, world.room);
      insertEvents(db, pet.id, meta.timezone, result.events);
      if (!idleTalk) saveMeta(db, { ...meta, lastInteractedAt: now, lastSeenAt: now });
      return result;
    })();

    return c.json(view(now, advance(db, now), reaction && { bubble: reaction.bubble, reaction: reaction.reaction }));
  });

  /** 1 つの操作を適用する。トランザクションの中で呼ばれる */
  function runAction(action: Action, world: World, now: number, ctx: CareContext): CareResult {
    switch (action.type) {
      case "rename": {
        const name = typeof action.name === "string" ? action.name.trim() : "";
        if (name.length < 1 || name.length > 12) throw new BadRequest("invalid_name");
        world.pet.name = name;
        return {
          bubble: "",
          reaction: "none",
          events: [{ at: now, eventId: "rename", kind: "user", importance: "normal", text: `なまえが「${name}」になった。` }],
        };
      }
      case "feed": {
        if (typeof action.foodId !== "string" || !getFood(action.foodId)) throw new BadRequest("unknown_food");
        if (!hasItem(db, action.foodId)) throw new BadRequest("out_of_stock");
        const result = feed(world, action.foodId, now, ctx);
        if (result.consumed) useItem(db, action.foodId);
        return result;
      }
      case "clean": {
        const ids = Array.isArray(action.litterIds)
          ? action.litterIds.filter((id): id is string => typeof id === "string")
          : undefined;
        const result = clean(world, ids, now, ctx);
        if (result.foundFoodId) addItem(db, result.foundFoodId, "food", 1, now);
        return result;
      }
      case "talk":
        return talk(world, now, ctx, action.idle === true);
      case "lights":
        return setLights(world, action.on === true, now, ctx);
      default:
        throw new BadRequest("unknown_action");
    }
  }

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
