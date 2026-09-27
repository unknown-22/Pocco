import { newId } from "./id.ts";
import type { Ceremony, DecorTarget, GameId, Pet, RoomState, Selfie, TimelineEvent, WearSlot } from "@pocco/sim";

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
  /** 写真にするのを待っている自撮り */
  pendingSelfies: (Selfie & { petId: string })[];
  /** まだ見ていない節目（孵化・進化・シニア）。古いものから 1 つずつ */
  pendingCeremony: Ceremony | null;
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
  | { type: "farewell_seen"; petId: string }
  | { type: "ceremony_seen"; at: number }
  | { type: "equip"; slot: WearSlot; itemId: string | null }
  | { type: "decorate"; target: DecorTarget; itemId: string | null }
  | { type: "play"; game: GameId; score: number; success: boolean };

export interface Photo {
  id: string;
  petId: string;
  takenAt: number;
  caption: string;
  kind: string;
}

export interface CollectionState {
  entries: { category: string; entryId: string; firstAt: number }[];
  rate: number;
  rewards: { at: number; itemId: string; kind: string; name: string; granted: boolean }[];
}

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
  // async にして、送る前のエラーも失敗として受け取れるようにする（画面に「通信エラー」を出す）
  sendAction: async (action: Action) => postJson<GameState>("/api/actions", { clientActionId: newId(), action }),
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
  getCollection: () => request<CollectionState>("/api/collection"),
  getPhotos: (petId?: string) => request<{ photos: Photo[] }>(`/api/photos${petId ? `?petId=${petId}` : ""}`),
  deletePhoto: (id: string) => request<{ ok: true }>(`/api/photos/${id}`, { method: "DELETE" }),
  photoUrl: (id: string) => `/api/photos/${id}/image`,
  markRead: (upToId: number) => postJson<{ unread: number }>("/api/timeline/read", { upToId }),
  debugAdvance: (minutes: number) => postJson<GameState>("/api/debug/advance", { minutes }),
};
