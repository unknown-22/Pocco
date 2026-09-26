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
  /** ペットの吹き出し。id は表示を切り替えるための連番 */
  bubble: { text: string; id: number } | null;
  sheet: "food" | "status" | null;
  setSheet: (sheet: Store["sheet"]) => void;
  setTab: (tab: Tab) => void;
  refresh: () => Promise<void>;
  send: (action: Action) => Promise<GameState | null>;
  loadTimeline: (more?: boolean) => Promise<void>;
  markRead: (upToId: number) => Promise<void>;
  debugAdvance: (minutes: number) => Promise<void>;
}

export const useStore = create<Store>((set, get) => {
  let bubbleId = 0;
  const apply = (game: GameState) => {
    set({ game, clockOffset: game.serverNow - Date.now(), error: null });
    if (game.reaction?.bubble) set({ bubble: { text: game.reaction.bubble, id: ++bubbleId } });
    return game;
  };
  const fail = (e: unknown) => {
    set({ error: e instanceof Error ? e.message : String(e) });
    return null;
  };

  return {
    game: null,
    clockOffset: 0,
    error: null,
    tab: "home",
    timeline: { entries: [], hasMore: false, loading: false },
    bubble: null,
    sheet: null,
    setSheet: (sheet) => set({ sheet }),
    setTab: (tab) => set({ tab }),
    refresh: () => api.getState().then(apply, fail).then(() => undefined),
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

    debugAdvance: (minutes) => api.debugAdvance(minutes).then(apply, fail).then(() => undefined),
  };
});

export const serverNow = () => Date.now() + useStore.getState().clockOffset;
