import type { Pet, RoomState, TimelineEvent } from "@pocco/sim";

export interface InventoryItem {
  itemId: string;
  kind: string;
  count: number;
}

export interface Reaction {
  bubble: string;
  reaction: "love" | "normal" | "dislike" | "full" | "asleep" | "none";
}

export interface GameState {
  serverNow: number;
  timezone: string;
  pet: Pet;
  room: RoomState;
  inventory: InventoryItem[];
  unread: number;
  absence: { from: number; to: number } | null;
  debug: boolean;
  reaction?: Reaction;
}

export interface TimelineEntry extends TimelineEvent {
  id: number;
  read: boolean;
}

export type Action =
  | { type: "rename"; name: string }
  | { type: "feed"; foodId: string }
  | { type: "clean"; litterIds?: string[] }
  | { type: "talk"; idle?: boolean }
  | { type: "lights"; on: boolean };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const postJson = <T>(path: string, body: unknown) =>
  request<T>(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

export const api = {
  getState: () => request<GameState>("/api/state"),
  sendAction: (action: Action) =>
    postJson<GameState>("/api/actions", { clientActionId: crypto.randomUUID(), action }),
  getTimeline: (before?: { at: number; id: number }, limit = 50) => {
    const q = new URLSearchParams({ limit: String(limit) });
    if (before) {
      q.set("beforeAt", String(before.at));
      q.set("beforeId", String(before.id));
    }
    return request<{ entries: TimelineEntry[]; hasMore: boolean }>(`/api/timeline?${q}`);
  },
  markRead: (upToId: number) => postJson<{ unread: number }>("/api/timeline/read", { upToId }),
  debugAdvance: (minutes: number) => postJson<GameState>("/api/debug/advance", { minutes }),
};
