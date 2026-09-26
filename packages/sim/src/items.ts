// 拾い物（仕様書 10.6）。散歩や部屋の中で見つかる。

import type { Rng } from "./rng.ts";

export type Rarity = "common" | "rare";

export interface Treasure {
  id: string;
  name: string;
  icon: string;
  rarity: Rarity;
  /** 見つかる季節（月）。省略すると一年中 */
  months?: number[];
  /** 拾うと見つけやすくなる趣味 */
  hobby?: string;
}

export const TREASURES: Treasure[] = [
  { id: "acorn", name: "どんぐり", icon: "🌰", rarity: "common", months: [9, 10, 11, 12] },
  { id: "pinecone", name: "まつぼっくり", icon: "🌲", rarity: "common", months: [10, 11, 12, 1] },
  { id: "petal", name: "さくらの花びら", icon: "🌸", rarity: "common", months: [3, 4] },
  { id: "shell", name: "貝がら", icon: "🐚", rarity: "common", months: [6, 7, 8] },
  { id: "stone", name: "きれいな石", icon: "🪨", rarity: "common" },
  { id: "feather", name: "鳥の羽", icon: "🪶", rarity: "common" },
  { id: "marble", name: "ビー玉", icon: "🔮", rarity: "common" },
  { id: "button", name: "ボタン", icon: "🔘", rarity: "common" },
  { id: "coin", name: "古いコイン", icon: "🪙", rarity: "common" },
  { id: "leaf_red", name: "赤い葉っぱ", icon: "🍁", rarity: "common", months: [10, 11] },
  { id: "seed", name: "花のたね", icon: "🌱", rarity: "common", hobby: "gardening" },
  { id: "picture_book", name: "古い絵本", icon: "📕", rarity: "rare", hobby: "reading" },
  { id: "harmonica", name: "ハーモニカ", icon: "🎵", rarity: "rare", hobby: "music" },
  { id: "clover", name: "四つ葉のクローバー", icon: "🍀", rarity: "rare" },
  { id: "key", name: "ふしぎな鍵", icon: "🗝️", rarity: "rare" },
  { id: "star_piece", name: "星のかけら", icon: "⭐", rarity: "rare" },
];

/** 部屋の中で見つかるもの */
export const HOUSE_FINDS = ["coin", "button", "marble", "key"];

const byId = new Map(TREASURES.map((t) => [t.id, t]));
export const getTreasure = (id: string) => byId.get(id);

/** 散歩で拾うものを選ぶ。好奇心が高いほどレアが出やすい */
export function pickWalkTreasure(rng: Rng, month: number, curiosity: number): Treasure {
  const rareChance = 0.08 + Math.max(0, curiosity) / 800;
  const pool = TREASURES.filter(
    (t) => (!t.months || t.months.includes(month)) && (rng() < rareChance ? t.rarity === "rare" : t.rarity === "common"),
  );
  return pool[Math.floor(rng() * pool.length)]!;
}

export const RARITY_RANK: Record<Rarity, number> = { common: 1, rare: 2 };
