// ペットの状態（仕様書 13.2）

export type Stage =
  | "egg"
  | "baby"
  | "child"
  | "teen"
  | "adult"
  | "senior"
  | "final_day"
  | "departed";

export interface Needs {
  hunger: number;
  sleepiness: number;
  boredom: number;
  loneliness: number;
}

export interface Personality {
  energy: number;
  tidiness: number;
  curiosity: number;
  attachment: number;
  appetite: number;
  chronotype: number;
}

export type ActivityType =
  | "egg"
  | "idle"
  | "wander"
  | "sleep"
  | "nap"
  | "play"
  | "window"
  | "eat"
  | "tidy";

/** 部屋の中のどこにいるか（描画用） */
export type Spot = "floor" | "bed" | "rug" | "window" | "fridge";

export interface Activity {
  type: ActivityType;
  since: number;
  /** この時刻までは続ける */
  until?: number;
  spot?: Spot;
}

export interface Equipped {
  hat?: string;
  clothes?: string;
  accessory?: string;
  hand?: string;
}

export interface PetState {
  stage: Stage;
  speciesId: string;
  needs: Needs;
  personality: Personality;
  foodPrefs: Record<string, number>;
  hobbies: string[];
  activity: Activity;
  equipped: Equipped;
  lifespanModifier: number;
  stats: Record<string, number>;
  keepsakeItemId?: string;
  /** 行動ごとの最後の発生時刻（クールダウン用） */
  cooldowns: Record<string, number>;
  /** 性格の 1 日あたりの変化量の記録（仕様書 6.3） */
  drift: { day: string; used: Partial<Record<keyof Personality, number>> };
}

export interface Pet {
  id: string;
  generation: number;
  parentId: string | null;
  name: string;
  bornAt: number;
  diedAt: number | null;
  state: PetState;
}

export interface RoomState {
  mess: number;
  wallpaperId: string;
  floorId: string;
  furniture: Record<string, string>;
  litter: { id: string; kind: string; x: number; y: number }[];
}

export type Importance = "normal" | "rare" | "major";

/** タイムラインに書く出来事（仕様書 9 章） */
export interface TimelineEvent {
  at: number;
  endAt?: number;
  eventId: string;
  text: string;
  importance: Importance;
  kind: "pet" | "user";
}
