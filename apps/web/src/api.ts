import type { Pet, RoomState } from "@pocco/sim";

export interface GameState {
  serverNow: number;
  timezone: string;
  pet: Pet | null;
  room: RoomState;
}

export type Action = { type: "rename"; name: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getState: () => request<GameState>("/api/state"),
  sendAction: (action: Action) =>
    request<GameState>("/api/actions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientActionId: crypto.randomUUID(), action }),
    }),
};
