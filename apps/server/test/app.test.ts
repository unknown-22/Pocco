import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { openDb } from "../src/db.ts";
import { createApp } from "../src/app.ts";
import { advance } from "../src/world.ts";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

function setup(start = Date.UTC(2026, 0, 5, 0, 0)) {
  let now = start;
  const db = openDb(":memory:");
  const app = createApp(db, { clock: () => now, debug: { advance: (ms) => (now += ms) } });
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
