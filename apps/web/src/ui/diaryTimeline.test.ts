import { describe, expect, it, vi } from "vitest";
import type { TimelineEntry } from "../api.ts";
import { createDiaryTimeline } from "./diaryTimeline.ts";

const entry = (id: number, at = 1000): TimelineEntry => ({
  id, at, read: false, eventId: "eat", kind: "pet", importance: "normal", text: `${id} の日記`,
});
const page = (entries: TimelineEntry[], hasMore = false) => ({ entries, hasMore });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe("世代ごとの日記", () => {
  it("選んだペットを指定し、同時刻の続きも ID カーソルで読む", async () => {
    const get = vi.fn().mockResolvedValueOnce(page([entry(3), entry(2)], true)).mockResolvedValueOnce(page([entry(1)]));
    const diary = createDiaryTimeline("first-generation", get);
    await diary.getState().load();
    expect(get).toHaveBeenNthCalledWith(1, undefined, 50, "first-generation");
    await diary.getState().load(true);
    expect(get).toHaveBeenNthCalledWith(2, { at: 1000, id: 2 }, 50, "first-generation");
    expect(diary.getState().entries.map((e) => e.id)).toEqual([3, 2, 1]);
    expect(diary.getState().hasMore).toBe(false);
    await diary.getState().load(true);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("切り替え前の世代の返事を、切り替え先に混ぜない", async () => {
    const oldResponse = deferred<ReturnType<typeof page>>();
    const get = vi.fn().mockReturnValueOnce(oldResponse.promise).mockResolvedValueOnce(page([entry(5)]));
    const old = createDiaryTimeline("old", get);
    const current = createDiaryTimeline("current", get);
    const pending = old.getState().load();
    await current.getState().load();
    oldResponse.resolve(page([entry(1)], true));
    await pending;
    expect(current.getState().entries.map((e) => e.id)).toEqual([5]);
    expect(current.getState().hasMore).toBe(false);
    expect(old.getState().entries.map((e) => e.id)).toEqual([1]);
    expect(get.mock.calls.map((call) => call[2])).toEqual(["old", "current"]);
  });

  it("新着の読み直しより遅く届く追加ページを捨てる", async () => {
    const olderPage = deferred<ReturnType<typeof page>>();
    const get = vi.fn()
      .mockResolvedValueOnce(page([entry(3)], true))
      .mockReturnValueOnce(olderPage.promise)
      .mockResolvedValueOnce(page([entry(4), entry(3)], true));
    const diary = createDiaryTimeline("current", get);
    await diary.getState().load();
    const pending = diary.getState().load(true);
    await diary.getState().load();
    olderPage.resolve(page([entry(2)]));
    await pending;
    expect(diary.getState().entries.map((e) => e.id)).toEqual([4, 3]);
    expect(diary.getState().hasMore).toBe(true);
  });

  it("ページ読み込み中の連打では同じページを二重取得しない", async () => {
    const olderPage = deferred<ReturnType<typeof page>>();
    const get = vi.fn().mockResolvedValueOnce(page([entry(2)], true)).mockReturnValueOnce(olderPage.promise);
    const diary = createDiaryTimeline("old", get);
    await diary.getState().load();
    const pending = diary.getState().load(true);
    await diary.getState().load(true);
    expect(get).toHaveBeenCalledTimes(2);
    olderPage.resolve(page([entry(1)]));
    await pending;
    expect(diary.getState().entries.map((e) => e.id)).toEqual([2, 1]);
  });

  it("通信失敗でも読んだページを残し、同じ世代の続きから再試行できる", async () => {
    const get = vi.fn()
      .mockResolvedValueOnce(page([entry(2)], true))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(page([entry(1)]));
    const diary = createDiaryTimeline("old", get);
    await diary.getState().load();
    await diary.getState().load(true);
    expect(diary.getState().entries.map((e) => e.id)).toEqual([2]);
    expect(diary.getState().loading).toBe(false);
    expect(diary.getState().error).toBe("日記を読み込めませんでした");
    await diary.getState().retry();
    expect(get).toHaveBeenNthCalledWith(3, { at: 1000, id: 2 }, 50, "old");
    expect(diary.getState().entries.map((e) => e.id)).toEqual([2, 1]);
    expect(diary.getState().error).toBeNull();
  });

  it("読み直しの再試行は、続きではなく最新ページを取得する", async () => {
    const get = vi.fn()
      .mockResolvedValueOnce(page([entry(2)], true))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(page([entry(3)], true));
    const diary = createDiaryTimeline("current", get);
    await diary.getState().load();
    await diary.getState().load();
    await diary.getState().retry();
    expect(get).toHaveBeenNthCalledWith(3, undefined, 50, "current");
    expect(diary.getState().entries.map((e) => e.id)).toEqual([3]);
  });

  it("古いリクエストの失敗で新しい結果をエラーにしない", async () => {
    const stale = deferred<ReturnType<typeof page>>();
    const get = vi.fn().mockReturnValueOnce(stale.promise).mockResolvedValueOnce(page([entry(4)]));
    const diary = createDiaryTimeline("current", get);
    const pending = diary.getState().load();
    await diary.getState().load();
    stale.reject(new Error("offline"));
    await pending;
    expect(diary.getState().error).toBeNull();
    expect(diary.getState().loading).toBe(false);
    expect(diary.getState().entries.map((e) => e.id)).toEqual([4]);
  });
});
