// API（仕様書 12 章）。

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import {
  ABSENT_AFTER_MS,
  REWARDS,
  clean,
  completionRate,
  decorate,
  depart,
  equip,
  feed,
  type DecorTarget,
  type WearSlot,
  getSpecies,
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
  deletePhoto,
  getCollection,
  getPhoto,
  hasPhotoOfKind,
  insertPhoto,
  listPhotos,
  owns,
  getInventory,
  getPet,
  listHighlights,
  listPets,
  recordDiscovery,
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
import { grantRewards, rewardName } from "./rewards.ts";

export type Clock = () => number;

export interface AppOptions {
  clock?: Clock;
  /** 開発用の時間早送り。指定したときだけ /api/debug/* が使える */
  debug?: { advance: (ms: number) => void };
  /** 写真の保存先 */
  photosDir?: string;
}

/** 写真 1 枚の上限 */
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export type Action =
  | { type: "rename"; name: string }
  | { type: "feed"; foodId: string }
  | { type: "clean"; litterIds?: string[] }
  | { type: "talk"; idle?: boolean }
  | { type: "lights"; on: boolean }
  | { type: "farewell_seen"; petId: string }
  | { type: "equip"; slot: WearSlot; itemId: string | null }
  | { type: "decorate"; target: DecorTarget; itemId: string | null };

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
    pendingFarewell: pendingFarewell(),
    absence: meta.absence,
    debug: Boolean(opts.debug),
    ...(reaction ? { reaction } : {}),
  });

  /** まだ見ていない旅立ち（演出・置き手紙）。次の世代が生まれていても見せる */
  function pendingFarewell() {
    const pet = listPets(db)
      .filter((p) => p.state.farewell && !p.state.farewell.seen)
      .at(-1);
    if (!pet) return null;
    return {
      petId: pet.id,
      name: pet.name,
      speciesId: pet.state.speciesId,
      bornAt: pet.bornAt,
      diedAt: pet.diedAt!,
      witnessed: pet.state.farewell!.witnessed,
      lastWords: pet.state.farewell!.lastWords,
    };
  }

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
      const pet = loaded.pet;
      if (pet.diedAt === null) next = deliverDailyGift(db, next, pet.id, now);
      // 最期の日に開くと、目を覚まして最後のひとことを言って旅立つ（看取り。仕様書 7.3）
      if (pet.state.stage === "final_day") {
        insertEvents(db, pet.id, next.timezone, depart(pet, now, true));
        savePet(db, pet);
      }
      return { ...loaded, meta: next };
    })();
    return c.json(view(now, result));
  });

  app.get("/api/timeline", (c) => {
    const { pet: current } = advance(db, clock());
    const petId = c.req.query("petId");
    const pet = petId ? getPet(db, petId) : current;
    if (!pet) return c.json({ error: "not_found" }, 404);
    const num = (v: string | undefined) => (v === undefined || v === "" ? undefined : Number(v));
    const limit = Math.min(100, Math.max(1, num(c.req.query("limit")) ?? 50));
    const entries = listTimeline(db, pet.id, {
      beforeAt: num(c.req.query("beforeAt")),
      beforeId: num(c.req.query("beforeId")),
      limit,
    });
    return c.json({ entries, hasMore: entries.length === limit });
  });

  // 思い出（仕様書 7.5）。歴代のペットを世代順に
  app.get("/api/memorial", (c) => {
    advance(db, clock());
    const pets = listPets(db).map((pet) => {
      const s = pet.state;
      const favoriteFood = Object.entries(s.stats)
        .filter(([k]) => k.startsWith("food_"))
        .sort((a, b) => b[1] - a[1])[0]?.[0]
        .slice(5);
      return {
        id: pet.id,
        name: pet.name,
        generation: pet.generation,
        bornAt: pet.bornAt,
        diedAt: pet.diedAt,
        stage: s.stage,
        speciesId: s.speciesId,
        speciesName: getSpecies(s.speciesId).name,
        personality: s.personality,
        hobbies: s.hobbies,
        favoriteFood: favoriteFood ?? null,
        keepsakeItemId: s.keepsakeItemId ?? null,
        lastWords: s.farewell?.lastWords ?? null,
        witnessed: s.farewell?.witnessed ?? null,
        highlights: listHighlights(db, pet.id, 12),
      };
    });
    return c.json({ pets });
  });

  app.get("/api/collection", (c) => {
    advance(db, clock());
    const entries = getCollection(db);
    const granted = new Set(entries.filter((e) => e.category === "reward").map((e) => e.entryId));
    return c.json({
      entries: entries.filter((e) => e.category !== "reward"),
      rate: completionRate(entries),
      rewards: REWARDS.map((r) => ({ ...r, name: rewardName(r), granted: granted.has(String(r.at)) })),
    });
  });

  // ---------------------------------------------------------------- 写真（仕様書 10.10）
  const photosDir = opts.photosDir;

  app.get("/api/photos", (c) => c.json({ photos: listPhotos(db, c.req.query("petId") || undefined) }));

  app.post("/api/photos", async (c) => {
    if (!photosDir) return c.json({ error: "photos_disabled" }, 404);
    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File) || file.type !== "image/png") return c.json({ error: "invalid_file" }, 400);
    if (file.size > MAX_PHOTO_BYTES) return c.json({ error: "too_large" }, 413);
    const now = clock();
    const { pet } = advance(db, now);
    const petId = typeof body.petId === "string" && body.petId ? body.petId : pet.id;
    const kind = body.kind === "farewell" ? "farewell" : "snap";
    // 最後の場面の写真は 1 匹につき 1 枚
    if (kind === "farewell" && hasPhotoOfKind(db, petId, "farewell")) return c.json({ skipped: true });

    const caption =
      typeof body.caption === "string" && body.caption.trim()
        ? body.caption.trim().slice(0, 60)
        : (listTimeline(db, petId, { limit: 50 }).find((e) => e.kind === "pet")?.text ?? "");
    const id = randomUUID();
    const name = `${id}.png`;
    fs.mkdirSync(photosDir, { recursive: true });
    fs.writeFileSync(path.join(photosDir, name), Buffer.from(await file.arrayBuffer()));
    insertPhoto(db, { id, petId, takenAt: now, caption, file: name, kind });
    return c.json({ photo: getPhoto(db, id) });
  });

  app.get("/api/photos/:id/image", (c) => {
    const photo = getPhoto(db, c.req.param("id"));
    if (!photo || !photosDir) return c.json({ error: "not_found" }, 404);
    const file = path.join(photosDir, path.basename(photo.file));
    if (!fs.existsSync(file)) return c.json({ error: "not_found" }, 404);
    return new Response(fs.readFileSync(file), {
      headers: { "content-type": "image/png", "cache-control": "private, max-age=31536000, immutable" },
    });
  });

  app.delete("/api/photos/:id", (c) => {
    const photo = getPhoto(db, c.req.param("id"));
    if (!photo) return c.json({ error: "not_found" }, 404);
    deletePhoto(db, photo.id);
    if (photosDir) fs.rmSync(path.join(photosDir, path.basename(photo.file)), { force: true });
    return c.json({ ok: true });
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
        memories:
          pet.state.stage === "final_day"
            ? listHighlights(db, pet.id, 30).map((e) => `${e.text.replace(/[。！]$/, "")}…なつかしいね`)
            : undefined,
      };
      const result = runAction(action, world, now, ctx);

      savePet(db, world.pet);
      saveRoom(db, world.room);
      insertEvents(db, pet.id, meta.timezone, result.events);
      if (!idleTalk) saveMeta(db, { ...meta, lastInteractedAt: now, lastSeenAt: now });
      grantRewards(db, now);
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
        if (result.events.some((e) => e.eventId === "first_food")) recordDiscovery(db, "food", action.foodId, now);
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
      case "equip": {
        const slots: WearSlot[] = ["hat", "clothes", "accessory", "hand"];
        if (!slots.includes(action.slot)) throw new BadRequest("invalid_slot");
        const itemId = typeof action.itemId === "string" ? action.itemId : null;
        if (itemId && !owns(db, itemId, "wear")) throw new BadRequest("not_owned");
        try {
          return equip(world, action.slot, itemId, now, ctx);
        } catch {
          throw new BadRequest("invalid_item");
        }
      }
      case "decorate": {
        const itemId = typeof action.itemId === "string" ? action.itemId : null;
        const kind = action.target === "wallpaper" ? "wallpaper" : action.target === "floor" ? "floor" : "furniture";
        if (itemId && !owns(db, itemId, kind)) throw new BadRequest("not_owned");
        try {
          return decorate(world, action.target, itemId, now, ctx);
        } catch {
          throw new BadRequest("invalid_item");
        }
      }
      case "farewell_seen": {
        // 見たのは先代かもしれないので、ID で探して直接保存する
        const target = world.pet.id === action.petId ? world.pet : getPet(db, String(action.petId));
        if (target?.state.farewell) {
          target.state.farewell.seen = true;
          if (target !== world.pet) savePet(db, target);
        }
        return { bubble: "", reaction: "none", events: [] };
      }
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
