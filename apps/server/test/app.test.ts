import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FOODS } from "@pocco/sim";
import { openDb } from "../src/db.ts";
import { createApp } from "../src/app.ts";
import { advance } from "../src/world.ts";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

function setup(start = Date.UTC(2026, 0, 5, 0, 0)) {
  let now = start;
  const db = openDb(":memory:");
  const photosDir = fs.mkdtempSync(path.join(os.tmpdir(), "pocco-photos-"));
  const app = createApp(db, { clock: () => now, debug: { advance: (ms) => (now += ms) }, photosDir });
  return { app, db, advance: (ms: number) => (now += ms), now: () => now };
}

type App = ReturnType<typeof setup>["app"];

async function post(app: App, path: string, body: unknown) {
  return app.request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
const getJson = async (app: App, path: string) => (await app.request(path)).json();

describe("GET /api/state", () => {
  it("初回アクセスでたまごが生まれ、2 回目も同じペットを返す", async () => {
    const { app } = setup();
    const first = await getJson(app, "/api/state");
    expect(first.pet.state.stage).toBe("egg");
    expect(first.timezone).toBe("Asia/Tokyo");
    const second = await getJson(app, "/api/state");
    expect(second.pet.id).toBe(first.pet.id);
  });

  it("1 時間経つとベビーになり、日記に書かれる", async () => {
    const { app, advance } = setup();
    await app.request("/api/state");
    advance(HOUR);
    const s = await getJson(app, "/api/state");
    expect(s.pet.state.stage).toBe("baby");
    expect(s.unread).toBeGreaterThan(0);
    const { entries } = await getJson(app, "/api/timeline");
    expect(entries.map((e: { eventId: string }) => e.eventId)).toContain("hatch");
  });

  it("30 分以上あけて開くと留守の期間が記録される", async () => {
    const { app, advance } = setup();
    const first = await getJson(app, "/api/state");
    advance(5 * HOUR);
    const s = await getJson(app, "/api/state");
    expect(s.absence).toEqual({ from: first.serverNow, to: s.serverNow });
  });
});

describe("タイムライン", () => {
  it("閉じている間に日記が増え、既読にできる", async () => {
    const { app, advance } = setup();
    await app.request("/api/state");
    advance(DAY);
    const s = await getJson(app, "/api/state");
    expect(s.unread).toBeGreaterThan(5);

    const { entries } = await getJson(app, "/api/timeline?limit=100");
    expect(entries.length).toBe(s.unread);
    // 新しい順
    for (let i = 1; i < entries.length; i++) expect(entries[i - 1].at).toBeGreaterThanOrEqual(entries[i].at);

    const maxId = Math.max(...entries.map((e: { id: number }) => e.id));
    const res = await (await post(app, "/api/timeline/read", { upToId: maxId })).json();
    expect(res.unread).toBe(0);
  });

  it("ページングで続きを取れる", async () => {
    const { app, advance } = setup();
    await app.request("/api/state");
    advance(2 * DAY);
    const all = (await getJson(app, "/api/timeline?limit=100")).entries;
    const page1 = await getJson(app, "/api/timeline?limit=5");
    const last = page1.entries.at(-1);
    const page2 = await getJson(app, `/api/timeline?limit=5&beforeAt=${last.at}&beforeId=${last.id}`);
    expect([...page1.entries, ...page2.entries]).toEqual(all.slice(0, 10));
  });

  it("定期実行（advance）とリクエスト時のキャッチアップで同じ日記になる", async () => {
    const a = setup();
    await a.app.request("/api/state");
    // 同じペット（同じ ID）で比べるため、a の DB を複製して b を作る
    let bNow = a.now();
    const bDb = new Database(a.db.serialize());
    const b = {
      app: createApp(bDb, { clock: () => bNow }),
      advance: (ms: number) => (bNow += ms),
    };
    // a は 1 分ごとに進める、b はまとめて進める
    for (let i = 0; i < 6 * 60; i++) {
      a.advance(60_000);
      advance(a.db, a.now());
    }
    b.advance(6 * HOUR);
    const ea = (await getJson(a.app, "/api/timeline?limit=100")).entries;
    const eb = (await getJson(b.app, "/api/timeline?limit=100")).entries;
    const strip = (es: { text: string; at: number }[]) => es.map((e) => [e.at, e.text]);
    expect(strip(ea)).toEqual(strip(eb));
  });
});

describe("POST /api/actions", () => {
  it("名前を変えられ、日記に残る", async () => {
    const { app } = setup();
    const res = await post(app, "/api/actions", { clientActionId: "a1", action: { type: "rename", name: "モチ" } });
    expect(res.status).toBe(200);
    expect((await res.json()).pet.name).toBe("モチ");
    const { entries } = await getJson(app, "/api/timeline");
    expect(entries[0].text).toBe("なまえが「モチ」になった。");
  });

  it("同じ clientActionId は 1 回だけ処理される", async () => {
    const { app } = setup();
    await post(app, "/api/actions", { clientActionId: "a1", action: { type: "rename", name: "モチ" } });
    const res = await post(app, "/api/actions", { clientActionId: "a1", action: { type: "rename", name: "ダンゴ" } });
    expect((await res.json()).pet.name).toBe("モチ");
  });

  it("不正な名前は 400", async () => {
    const { app } = setup();
    const res = await post(app, "/api/actions", { clientActionId: "a2", action: { type: "rename", name: "" } });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/debug/advance", () => {
  it("時間を早送りできる", async () => {
    const { app } = setup();
    await app.request("/api/state");
    const s = await (await post(app, "/api/debug/advance", { minutes: 24 * 60 })).json();
    expect(s.pet.state.stage).toBe("child");
  });

  it("debug を渡さなければ使えない", async () => {
    const db = openDb(":memory:");
    const app = createApp(db, { clock: () => 0 });
    const res = await post(app, "/api/debug/advance", { minutes: 10 });
    expect(res.status).toBe(404);
  });
});

describe("P2 おせわ", () => {
  const act = (app: App, action: unknown, id: string = crypto.randomUUID()) =>
    post(app, "/api/actions", { clientActionId: id, action });

  /** 孵化させて起こし、おなかを空かせる */
  async function hatched() {
    const ctx = setup();
    await ctx.app.request("/api/state");
    ctx.advance(3 * HOUR);
    await ctx.app.request("/api/state");
    const pet = ctx.db.prepare("SELECT id, state_json FROM pets").get() as { id: string; state_json: string };
    const state = JSON.parse(pet.state_json);
    state.activity = { type: "idle", since: ctx.now(), spot: "rug" };
    state.needs.hunger = 80;
    ctx.db.prepare("UPDATE pets SET state_json = ? WHERE id = ?").run(JSON.stringify(state), pet.id);
    return ctx;
  }

  it("最初から食べ物を持っていて、1 日 1 回おすそわけが届く", async () => {
    const { app, advance } = setup();
    const s1 = await getJson(app, "/api/state");
    const total = (s: { inventory: { kind: string; count: number }[] }) =>
      s.inventory.filter((i) => i.kind === "food").reduce((n, i) => n + i.count, 0);
    expect(total(s1)).toBe(10 + 3);
    const s2 = await getJson(app, "/api/state");
    expect(total(s2)).toBe(total(s1));
    advance(DAY);
    const s3 = await getJson(app, "/api/state");
    // 散歩の拾い物も増えるので、「おすそわけ」の日記の数で確かめる
    expect(total(s3)).toBeGreaterThanOrEqual(total(s1) + 3);
    const { entries } = await getJson(app, "/api/timeline?limit=100");
    expect(entries.filter((e: { eventId: string }) => e.eventId === "gift").length).toBe(2);
  });

  it("ごはんをあげると持ち物が減り、反応が返り、日記に残る", async () => {
    const { app } = await hatched();
    const before = (await getJson(app, "/api/state")).inventory.find((i: { itemId: string }) => i.itemId === "apple").count;
    const res = await (await act(app, { type: "feed", foodId: "apple" })).json();
    expect(["love", "normal", "dislike"]).toContain(res.reaction.reaction);
    expect(res.reaction.bubble).not.toBe("");
    expect(res.inventory.find((i: { itemId: string }) => i.itemId === "apple").count).toBe(before - 1);
    const { entries } = await getJson(app, "/api/timeline");
    expect(entries.some((e: { eventId: string }) => e.eventId.startsWith("feed_"))).toBe(true);
  });

  it("持っていない食べ物はあげられない", async () => {
    const { app } = await hatched();
    // おすそわけはランダムなので、持っていないものを探す
    const owned = new Set((await getJson(app, "/api/state")).inventory.map((i: { itemId: string }) => i.itemId));
    const missing = FOODS.find((f) => !owned.has(f.id))!;
    const res = await act(app, { type: "feed", foodId: missing.id });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("out_of_stock");
  });

  it("同じ操作を二重に送っても 1 回しか食べない", async () => {
    const { app } = await hatched();
    const r1 = await (await act(app, { type: "feed", foodId: "apple" }, "same")).json();
    const r2 = await (await act(app, { type: "feed", foodId: "apple" }, "same")).json();
    const count = (s: { inventory: { itemId: string; count: number }[] }) => s.inventory.find((i) => i.itemId === "apple")?.count;
    expect(count(r2)).toBe(count(r1));
    expect(r2.reaction).toBeUndefined();
  });

  it("掃除・電気・話しかける", async () => {
    const { app } = await hatched();
    const cleaned = await (await act(app, { type: "clean" })).json();
    expect(cleaned.room.litter).toEqual([]);
    const talked = await (await act(app, { type: "talk" })).json();
    expect(talked.reaction.bubble.length).toBeGreaterThan(0);
    const dark = await (await act(app, { type: "lights", on: false })).json();
    expect(dark.room.lightsOff).toBe(true);
  });

  it("独り言は状態を変えない", async () => {
    const { app, db } = await hatched();
    const before = (db.prepare("SELECT state_json FROM pets").get() as { state_json: string }).state_json;
    const res = await (await act(app, { type: "talk", idle: true })).json();
    expect(res.reaction.bubble.length).toBeGreaterThan(0);
    const after = (db.prepare("SELECT state_json FROM pets").get() as { state_json: string }).state_json;
    expect(after).toBe(before);
  });
});

describe("P3 一生と世代交代", () => {
  it("最期の日に開くと看取りになり、演出を見るまで残る", async () => {
    const { app, advance } = setup();
    await app.request("/api/state");
    advance(13 * DAY + 13 * HOUR); // 最期の日（寿命は世話で ±12 時間）
    // 早送りの途中で 1 回開いて、最期の日に入ったところで開く
    let s = await getJson(app, "/api/state");
    for (let i = 0; i < 24 && s.pet.state.stage !== "final_day" && s.pet.state.stage !== "departed"; i++) {
      advance(HOUR);
      s = await getJson(app, "/api/state");
    }
    expect(s.pet.state.stage).toBe("departed");
    expect(s.pendingFarewell).toMatchObject({ witnessed: true, petId: s.pet.id });
    expect(s.pendingFarewell.lastWords.at(-1)).toBe("……ありがとう");

    const seen = await (await post(app, "/api/actions", {
      clientActionId: "fw",
      action: { type: "farewell_seen", petId: s.pet.id },
    })).json();
    expect(seen.pendingFarewell).toBeNull();
  });

  it("誰も来ないと静かに旅立ち、翌朝 6 時にたまごが現れる。置き手紙は次の世代になっても残る", async () => {
    const { app, advance, now } = setup();
    const first = await getJson(app, "/api/state");
    advance(16 * DAY);
    const s = await getJson(app, "/api/state");
    expect(s.pet.generation).toBe(2);
    expect(s.pet.name).toBe("ポッコ2世");
    expect(s.pet.parentId).toBe(first.pet.id);
    expect(s.pendingFarewell).toMatchObject({ witnessed: false, petId: first.pet.id });

    const memorial = await getJson(app, "/api/memorial");
    expect(memorial.pets.map((p: { generation: number }) => p.generation)).toEqual([1, 2]);
    const parent = memorial.pets[0];
    expect(parent.diedAt).not.toBeNull();
    expect(parent.highlights.length).toBeGreaterThan(0);

    // 親の日記は petId で読める
    const diary = await getJson(app, `/api/timeline?petId=${parent.id}&limit=5`);
    expect(diary.entries[0].eventId).toBe("departed");

    // 新しいたまごが現れた時刻は、朝 6 時
    const { entries } = await getJson(app, "/api/timeline?limit=100");
    const egg = entries.find((e: { eventId: string }) => e.eventId === "new_egg");
    const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", hour: "numeric", hourCycle: "h23" }).format(egg.at));
    expect(hour).toBe(6);
    expect(egg.at).toBeLessThan(now());
  });

  it("図鑑に種族や拾い物が記録される", async () => {
    const { app, advance } = setup();
    await app.request("/api/state");
    advance(4 * DAY);
    await app.request("/api/state");
    const { entries } = await getJson(app, "/api/collection");
    const species = entries.filter((e: { category: string }) => e.category === "species").map((e: { entryId: string }) => e.entryId);
    expect(species).toContain("egg");
    expect(species).toContain("pocco");
    expect(species.length).toBeGreaterThanOrEqual(4);
  });
});

describe("nextEggTime", () => {
  const tz = "Asia/Tokyo";
  const jst = (d: number, h: number, m = 0) => Date.UTC(2026, 0, d, h - 9, m);
  it("夜中に旅立つと、その朝 6 時", async () => {
    const { nextEggTime } = await import("../src/world.ts");
    expect(nextEggTime(jst(10, 2, 53), tz)).toBe(jst(10, 6));
    expect(nextEggTime(jst(9, 21), tz)).toBe(jst(10, 6));
  });
  it("6 時まで 2 時間もなければ、次の朝", async () => {
    const { nextEggTime } = await import("../src/world.ts");
    expect(nextEggTime(jst(10, 5), tz)).toBe(jst(11, 6));
  });
});

describe("P4 着せ替え・模様替え・図鑑・写真", () => {
  const act = (app: App, action: unknown) =>
    post(app, "/api/actions", { clientActionId: crypto.randomUUID(), action });

  async function awake() {
    const ctx = setup();
    await ctx.app.request("/api/state");
    ctx.advance(3 * HOUR);
    await ctx.app.request("/api/state");
    const pet = ctx.db.prepare("SELECT id, state_json FROM pets").get() as { id: string; state_json: string };
    const state = JSON.parse(pet.state_json);
    state.activity = { type: "idle", since: ctx.now(), spot: "rug" };
    ctx.db.prepare("UPDATE pets SET state_json = ? WHERE id = ?").run(JSON.stringify(state), pet.id);
    return ctx;
  }

  it("最初から持っている帽子を着せられる。持っていない物は着せられない", async () => {
    const { app } = await awake();
    const ok = await (await act(app, { type: "equip", slot: "hat", itemId: "straw_hat" })).json();
    expect(ok.pet.state.equipped.hat).toBe("straw_hat");
    const ng = await act(app, { type: "equip", slot: "hat", itemId: "crown_gold" });
    expect((await ng.json()).error).toBe("not_owned");
    const off = await (await act(app, { type: "equip", slot: "hat", itemId: null })).json();
    expect(off.pet.state.equipped.hat).toBeUndefined();
  });

  it("持っている家具を置ける。持っていない壁紙は使えない", async () => {
    const { app } = await awake();
    const moved = await (await act(app, { type: "decorate", target: "floor_right", itemId: "plant_pot" })).json();
    expect(moved.room.furniture).toEqual({ floor_right: "plant_pot" });
    const ng = await act(app, { type: "decorate", target: "wallpaper", itemId: "wall_night" });
    expect((await ng.json()).error).toBe("not_owned");
  });

  it("図鑑の達成率が上がると、ごほうびがもらえる", async () => {
    const { app, advance } = setup();
    await app.request("/api/state");
    advance(5 * DAY);
    await app.request("/api/state");
    const col = await getJson(app, "/api/collection");
    expect(col.rate).toBeGreaterThanOrEqual(10);
    const granted = col.rewards.filter((r: { granted: boolean }) => r.granted);
    expect(granted.length).toBeGreaterThan(0);
    const s = await getJson(app, "/api/state");
    expect(s.inventory.some((i: { itemId: string }) => i.itemId === "wall_mint")).toBe(true);
    expect(col.entries.some((e: { category: string }) => e.category === "event")).toBe(true);
  });

  it("写真を保存して、一覧・画像・削除ができる", async () => {
    const { app } = await awake();
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    const form = new FormData();
    form.set("file", new File([png], "room.png", { type: "image/png" }));
    const res = await (await app.request("/api/photos", { method: "POST", body: form })).json();
    expect(res.photo.caption.length).toBeGreaterThan(0);
    const { photos } = await getJson(app, "/api/photos");
    expect(photos).toHaveLength(1);
    const img = await app.request(`/api/photos/${res.photo.id}/image`);
    expect(img.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await img.arrayBuffer())).toEqual(png);
    await app.request(`/api/photos/${res.photo.id}`, { method: "DELETE" });
    expect((await getJson(app, "/api/photos")).photos).toHaveLength(0);
  });

  it("最後の場面の写真は 1 匹につき 1 枚だけ", async () => {
    const { app } = await awake();
    const send = async () => {
      const form = new FormData();
      form.set("file", new File([Buffer.from("x")], "a.png", { type: "image/png" }));
      form.set("kind", "farewell");
      return (await app.request("/api/photos", { method: "POST", body: form })).json();
    };
    expect((await send()).photo).toBeDefined();
    expect((await send()).skipped).toBe(true);
  });

  it("PNG 以外は受け付けない", async () => {
    const { app } = await awake();
    const form = new FormData();
    form.set("file", new File(["hello"], "a.txt", { type: "text/plain" }));
    const res = await app.request("/api/photos", { method: "POST", body: form });
    expect(res.status).toBe(400);
  });
});

describe("P5 ミニゲーム", () => {
  it("遊んだ結果が反映され、日記に残る。変な値は受け付けない", async () => {
    const { app, db, advance, now } = setup();
    await app.request("/api/state");
    advance(3 * HOUR);
    await app.request("/api/state");
    const pet = db.prepare("SELECT id, state_json FROM pets").get() as { id: string; state_json: string };
    const state = JSON.parse(pet.state_json);
    state.activity = { type: "idle", since: now(), spot: "rug" };
    db.prepare("UPDATE pets SET state_json = ? WHERE id = ?").run(JSON.stringify(state), pet.id);

    const ok = await (await post(app, "/api/actions", {
      clientActionId: "g1",
      action: { type: "play", game: "rhythm", score: 3, success: true },
    })).json();
    expect(ok.reaction.reaction).toBe("love");
    const { entries } = await getJson(app, "/api/timeline");
    expect(entries[0].eventId).toBe("minigame");

    const bad = await post(app, "/api/actions", {
      clientActionId: "g2",
      action: { type: "play", game: "tetris", score: 1, success: true },
    });
    expect(bad.status).toBe(400);
  });
});
