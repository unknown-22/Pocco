import { describe, expect, it } from "vitest";
import { openDb } from "../src/db.ts";
import { createApp } from "../src/app.ts";

function setup(start = 1_700_000_000_000) {
  let now = start;
  const db = openDb(":memory:");
  const app = createApp(db, () => now);
  return { app, advance: (ms: number) => (now += ms) };
}

async function post(app: ReturnType<typeof setup>["app"], body: unknown) {
  return app.request("/api/actions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/state", () => {
  it("初回アクセスでたまごが生まれ、2 回目も同じペットを返す", async () => {
    const { app } = setup();
    const first = await (await app.request("/api/state")).json();
    expect(first.pet.state.stage).toBe("egg");
    expect(first.timezone).toBe("Asia/Tokyo");
    const second = await (await app.request("/api/state")).json();
    expect(second.pet.id).toBe(first.pet.id);
  });

  it("1 時間経つとベビーになる", async () => {
    const { app, advance } = setup();
    await app.request("/api/state");
    advance(60 * 60 * 1000);
    const s = await (await app.request("/api/state")).json();
    expect(s.pet.state.stage).toBe("baby");
  });
});

describe("POST /api/actions", () => {
  it("名前を変えられる", async () => {
    const { app } = setup();
    const res = await post(app, { clientActionId: "a1", action: { type: "rename", name: "モチ" } });
    expect(res.status).toBe(200);
    expect((await res.json()).pet.name).toBe("モチ");
  });

  it("同じ clientActionId は 1 回だけ処理される", async () => {
    const { app } = setup();
    await post(app, { clientActionId: "a1", action: { type: "rename", name: "モチ" } });
    const res = await post(app, { clientActionId: "a1", action: { type: "rename", name: "ダンゴ" } });
    expect((await res.json()).pet.name).toBe("モチ");
  });

  it("不正な名前は 400", async () => {
    const { app } = setup();
    const res = await post(app, { clientActionId: "a2", action: { type: "rename", name: "" } });
    expect(res.status).toBe(400);
  });
});
