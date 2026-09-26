import { create } from "zustand";
import { api, type Action, type GameState } from "./api.ts";

export type Tab = "home" | "diary" | "items" | "collection" | "settings";

interface Store {
  game: GameState | null;
  /** サーバー時刻 − 端末時刻。時計表示をサーバーに合わせるのに使う。 */
  clockOffset: number;
  error: string | null;
  tab: Tab;
  setTab: (tab: Tab) => void;
  refresh: () => Promise<void>;
  send: (action: Action) => Promise<void>;
}

export const useStore = create<Store>((set) => {
  const apply = (game: GameState) =>
    set({ game, clockOffset: game.serverNow - Date.now(), error: null });
  const fail = (e: unknown) =>
    set({ error: e instanceof Error ? e.message : String(e) });

  return {
    game: null,
    clockOffset: 0,
    error: null,
    tab: "home",
    setTab: (tab) => set({ tab }),
    refresh: () => api.getState().then(apply, fail),
    send: (action) => api.sendAction(action).then(apply, fail),
  };
});

export const serverNow = () => Date.now() + useStore.getState().clockOffset;
