import { afterEach, describe, expect, it } from "vitest";
import { newId } from "./id.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("newId", () => {
  const original = crypto.randomUUID;
  afterEach(() => Object.defineProperty(crypto, "randomUUID", { value: original, configurable: true }));

  it("crypto.randomUUID がない（LAN の HTTP で開いた）ときも UUID を作れる", () => {
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
    const ids = new Set(Array.from({ length: 100 }, () => newId()));
    expect(ids.size).toBe(100);
    for (const id of ids) expect(id).toMatch(UUID);
  });

  it("使えるときは crypto.randomUUID を使う", () => {
    expect(newId()).toMatch(UUID);
  });
});
