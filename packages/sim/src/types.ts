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
  activity: { type: string; since: number; location?: string };
  equipped: Equipped;
  lifespanModifier: number;
  stats: Record<string, number>;
  keepsakeItemId?: string;
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
