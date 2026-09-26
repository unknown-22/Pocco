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
  | "tidy"
  | "hobby"
  | "out"
  | "departed";

/** 部屋の中のどこにいるか（描画用） */
export type Spot = "floor" | "bed" | "rug" | "window" | "fridge";

export interface Activity {
  type: ActivityType;
  since: number;
  /** この時刻までは続ける */
  until?: number;
  spot?: Spot;
  hobbyId?: string;
  /** 家具を使っているとき、その家具の場所 */
  slot?: string;
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
  /** その日の暮らしぶり（寿命の前後に使う。仕様書 7.2） */
  today: DailyLog;
  /** 自分で拾った物（趣味の条件・形見に使う） */
  treasures: string[];
  /** 親が持っていた趣味（見つけやすい） */
  inheritedHobbies: string[];
  /** 旅立ったときの記録 */
  farewell?: Farewell;
  /** 留守中に自撮りした場面。次に開いたときに画面側で写真にする（仕様書 10.10） */
  selfies: Selfie[];
  /** まだ見ていない節目（孵化・進化・シニア）。画面が全画面の演出で見せる（仕様書 11.2） */
  ceremonies: Ceremony[];
}

export interface Ceremony {
  kind: "hatch" | "evolve" | "senior";
  at: number;
  /** 新しい段階 */
  stage: Stage;
  /** 前の種族（孵化はたまご） */
  fromSpecies: string;
  /** 前の段階 */
  fromStage: Stage;
  toSpecies: string;
}

/** 自撮りしたときの姿（写真を描くのに使う） */
export interface Selfie {
  at: number;
  stage: Stage;
  speciesId: string;
  equipped: Equipped;
  /** 日記と同じ文。写真のキャプションになる */
  text: string;
}

export interface DailyLog {
  day: string;
  /** 就寝時刻の範囲内に寝た */
  sleptOnTime: boolean;
  /** 夜に起こされた */
  wokenAtNight: boolean;
  /** ユーザーがあげた食べ物の味タグ（重複あり） */
  tags: string[];
  /** ユーザーと遊んだ（P5 のミニゲーム） */
  played: boolean;
}

export interface Farewell {
  /** 看取られたか */
  witnessed: boolean;
  lastWords: string[];
  /** 旅立ちの演出・置き手紙をユーザーが見たか */
  seen: boolean;
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
  /** 電気を消しているか（仕様書 10.4） */
  lightsOff?: boolean;
  /** 窓ぎわに置いてある、先代の形見（仕様書 7.4） */
  keepsakeItemId?: string;
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
