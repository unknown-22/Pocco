// 趣味（仕様書 6.4）。条件を満たすと「趣味を見つけた」。最大 3 つ。
// 性格・行動の回数・拾った物・部屋の家具で決まる。

import type { PetState } from "./types.ts";

export interface Hobby {
  id: string;
  name: string;
  icon: string;
  /**
   * 見つける条件。owned は自分で拾った物、furniture は部屋に置いてある家具、
   * easy は親が同じ趣味を持っていたとき（条件がゆるくなる）
   */
  discover: (s: PetState, owned: Set<string>, easy: boolean, furniture: Set<string>) => boolean;
  /** 趣味の行動をしたときの日記 */
  texts: string[];
  /** 夜にやりがち */
  night?: boolean;
}

const k = (easy: boolean, n: number) => (easy ? Math.ceil(n / 2) : n);
const stat = (s: PetState, id: string) => s.stats[id] ?? 0;

export const HOBBIES: Hobby[] = [
  {
    id: "collecting",
    name: "コレクション",
    icon: "🧺",
    discover: (s, _o, e, f) =>
      stat(s, "find") + stat(s, "walk") >= k(e, f.has("collection_shelf") ? 2 : 4) && s.personality.curiosity > k(e, 10),
    texts: ["拾ったものを並べて、ながめていた。", "コレクションの並べ方を変えていた。"],
  },
  {
    id: "cooking",
    name: "りょうり",
    icon: "🍳",
    discover: (s, _o, e) => stat(s, "eat") >= k(e, 6),
    texts: ["冷蔵庫のものでなぞの料理を作った。", "鍋をかきまぜるまねをしていた。"],
  },
  {
    id: "stargazing",
    name: "ほしぞら観察",
    icon: "🔭",
    discover: (s, _o, e, f) =>
      f.has("telescope") ? s.personality.chronotype > k(e, 5) : s.personality.chronotype > k(e, 25) && stat(s, "window") >= k(e, 8),
    texts: ["窓から星座を探していた。", "流れ星を待っていた。"],
    night: true,
  },
  {
    id: "dance",
    name: "ダンス",
    icon: "💃",
    discover: (s, _o, e) => s.personality.energy > k(e, 30) && stat(s, "play") >= k(e, 10),
    texts: ["ダンスの練習をしていた。", "くるくる回るステップを覚えた。"],
  },
  {
    id: "music",
    name: "おんがく",
    icon: "🎵",
    discover: (s, owned, _e, f) => owned.has("harmonica") || (f.has("radio") && stat(s, "furniture_radio") >= 3),
    texts: ["ハーモニカを吹いていた。", "鼻歌に合わせてハーモニカを吹いた。"],
  },
  {
    id: "reading",
    name: "どくしょ",
    icon: "📖",
    discover: (s, owned, _e, f) => (owned.has("picture_book") || f.has("bookshelf")) && s.personality.energy < 20,
    texts: ["絵本を読んでいた。", "絵本の同じページをずっと見ていた。"],
  },
  {
    id: "gardening",
    name: "ガーデニング",
    icon: "🪴",
    discover: (s, owned, e, f) => (owned.has("seed") || f.has("plant_pot")) && s.personality.tidiness > (e ? 0 : 10),
    texts: ["植木鉢の手入れをしていた。", "植木鉢の芽に話しかけていた。"],
  },
];

export const MAX_HOBBIES = 3;

const byId = new Map(HOBBIES.map((h) => [h.id, h]));
export const getHobby = (id: string) => byId.get(id);
