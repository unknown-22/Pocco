import { createStore } from "zustand/vanilla";
import { api, type TimelineEntry } from "../api.ts";

interface DiaryTimeline {
  entries: TimelineEntry[];
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  load: (more?: boolean) => Promise<void>;
  retry: () => Promise<void>;
}

/** 世代ごとに独立した日記。読み直しより遅れて届いたページは混ぜない。 */
export function createDiaryTimeline(petId: string, getTimeline = api.getTimeline) {
  let requestId = 0;
  let retryMore = false;
  return createStore<DiaryTimeline>((set, get) => ({
    entries: [],
    hasMore: false,
    loading: true,
    error: null,
    retry: () => get().load(retryMore),
    load: async (more = false) => {
      const current = get();
      if (more && (current.loading || !current.hasMore)) return;
      retryMore = more;
      const id = ++requestId;
      const last = more ? current.entries.at(-1) : undefined;
      set({ loading: true, error: null });
      try {
        const result = await getTimeline(last && { at: last.at, id: last.id }, 50, petId);
        if (id !== requestId) return;
        set({
          entries: more ? [...current.entries, ...result.entries] : result.entries,
          hasMore: result.hasMore,
          loading: false,
        });
      } catch {
        if (id !== requestId) return;
        set({ loading: false, error: "日記を読み込めませんでした" });
      }
    },
  }));
}
