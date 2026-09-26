import { create } from "zustand";
import { api, type Action, type GameState, type TimelineEntry } from "./api.ts";

export type Tab = "home" | "diary" | "items" | "collection" | "settings";

interface Store {
  game: GameState | null;
  /** サーバー時刻 − 端末時刻。時計表示をサーバーに合わせるのに使う。 */
  clockOffset: number;
  error: string | null;
  tab: Tab;
  timeline: { entries: TimelineEntry[]; hasMore: boolean; loading: boolean };
  setTab: (tab: Tab) => void;
  refresh: () => Promise<void>;
  send: (action: Action) => Promise<void>;
  loadTimeline: (more?: boolean) => Promise<void>;
  markRead: (upToId: number) => Promise<void>;
  debugAdvance: (minutes: number) => Promise<void>;
}

export const useStore = create<Store>((set, get) => {
  const apply = (game: GameState) =>
    set({ game, clockOffset: game.serverNow - Date.now(), error: null });
  const fail = (e: unknown) => set({ error: e instanceof Error ? e.message : String(e) });

  return {
    game: null,
    clockOffset: 0,
    error: null,
    tab: "home",
    timeline: { entries: [], hasMore: false, loading: false },
    setTab: (tab) => set({ tab }),
    refresh: () => api.getState().then(apply, fail),
    send: (action) => api.sendAction(action).then(apply, fail),

    loadTimeline: async (more = false) => {
      const current = get().timeline;
      if (current.loading) return;
      set({ timeline: { ...current, loading: true } });
      const last = more ? current.entries.at(-1) : undefined;
      try {
        const res = await api.getTimeline(last && { at: last.at, id: last.id });
        set({
          timeline: {
            entries: more ? [...current.entries, ...res.entries] : res.entries,
            hasMore: res.hasMore,
            loading: false,
          },
        });
      } catch (e) {
        set({ timeline: { ...get().timeline, loading: false } });
        fail(e);
      }
    },

    markRead: async (upToId) => {
      try {
        const { unread } = await api.markRead(upToId);
        const game = get().game;
        if (game) set({ game: { ...game, unread } });
      } catch (e) {
        fail(e);
      }
    },

    debugAdvance: (minutes) => api.debugAdvance(minutes).then(apply, fail),
  };
});

export const serverNow = () => Date.now() + useStore.getState().clockOffset;
