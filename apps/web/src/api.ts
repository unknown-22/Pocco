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
  pendingFarewell: PendingFarewell | null;
}

export interface PendingFarewell {
  petId: string;
  name: string;
  speciesId: string;
  bornAt: number;
  diedAt: number;
  witnessed: boolean;
  lastWords: string[];
}

export interface MemorialPet {
  id: string;
  name: string;
  generation: number;
  bornAt: number;
  diedAt: number | null;
  stage: string;
  speciesId: string;
  speciesName: string;
  personality: Record<string, number>;
  hobbies: string[];
  favoriteFood: string | null;
  keepsakeItemId: string | null;
  lastWords: string[] | null;
  witnessed: boolean | null;
  highlights: TimelineEntry[];
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
  | { type: "lights"; on: boolean }
  | { type: "farewell_seen"; petId: string };

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
  getTimeline: (before?: { at: number; id: number }, limit = 50, petId?: string) => {
    const q = new URLSearchParams({ limit: String(limit) });
    if (petId) q.set("petId", petId);
    if (before) {
      q.set("beforeAt", String(before.at));
      q.set("beforeId", String(before.id));
    }
    return request<{ entries: TimelineEntry[]; hasMore: boolean }>(`/api/timeline?${q}`);
  },
  getMemorial: () => request<{ pets: MemorialPet[] }>("/api/memorial"),
  markRead: (upToId: number) => postJson<{ unread: number }>("/api/timeline/read", { upToId }),
  debugAdvance: (minutes: number) => postJson<GameState>("/api/debug/advance", { minutes }),
};
