// 拾い物（仕様書 10.6）。散歩や部屋の中で見つかる。

import type { Rng } from "./rng.ts";

export type Rarity = "common" | "rare";

export interface Treasure {
  id: string;
  name: string;
  icon: string;
  rarity: Rarity;
  /** 同じレア度の中で見つかりやすさを決める重み */
  findWeight: number;
  /** 見つかる季節（月）。省略すると一年中 */
  months?: number[];
  /** 拾うと見つけやすくなる趣味 */
  hobby?: string;
}

export const TREASURES: Treasure[] = [
  { id: "acorn", findWeight: 30, name: "どんぐり", icon: "🌰", rarity: "common", months: [9, 10, 11, 12] },
  { id: "pinecone", findWeight: 30, name: "まつぼっくり", icon: "🌲", rarity: "common", months: [10, 11, 12, 1] },
  { id: "petal", findWeight: 30, name: "さくらの花びら", icon: "🌸", rarity: "common", months: [3, 4] },
  { id: "shell", findWeight: 30, name: "貝がら", icon: "🐚", rarity: "common", months: [6, 7, 8] },
  { id: "stone", findWeight: 40, name: "きれいな石", icon: "🪨", rarity: "common" },
  { id: "feather", findWeight: 30, name: "鳥の羽", icon: "🪶", rarity: "common" },
  { id: "marble", findWeight: 30, name: "ビー玉", icon: "🔮", rarity: "common" },
  { id: "button", findWeight: 40, name: "ボタン", icon: "🔘", rarity: "common" },
  { id: "coin", findWeight: 20, name: "古いコイン", icon: "🪙", rarity: "common" },
  { id: "leaf_red", findWeight: 30, name: "赤い葉っぱ", icon: "🍁", rarity: "common", months: [10, 11] },
  { id: "seed", findWeight: 30, name: "花のたね", icon: "🌱", rarity: "common", hobby: "gardening" },
  { id: "picture_book", findWeight: 3, name: "古い絵本", icon: "📕", rarity: "rare", hobby: "reading" },
  { id: "harmonica", findWeight: 3, name: "ハーモニカ", icon: "🎵", rarity: "rare", hobby: "music" },
  { id: "clover", findWeight: 4, name: "四つ葉のクローバー", icon: "🍀", rarity: "rare" },
  { id: "key", findWeight: 1, name: "ふしぎな鍵", icon: "🗝️", rarity: "rare" },
  { id: "star_piece", findWeight: 1, name: "星のかけら", icon: "⭐", rarity: "rare" },
];

/** 部屋の中で見つかるもの */
export const HOUSE_FINDS = ["coin", "button", "marble", "key"];

const byId = new Map(TREASURES.map((t) => [t.id, t]));
export const getTreasure = (id: string) => byId.get(id);

/** 候補の重みを足して一度だけ抽選する。候補は必ず 1 個以上ある。 */
function pickWeightedTreasure(rng: Rng, pool: Treasure[]): Treasure {
  let roll = rng() * pool.reduce((sum, item) => sum + item.findWeight, 0);
  for (const item of pool) {
    roll -= item.findWeight;
    if (roll < 0) return item;
  }
  return pool[pool.length - 1]!;
}

/** 部屋ではボタンやビー玉が多く、ふしぎな鍵は約 1.1%（1 / 91）。 */
export function pickHouseTreasure(rng: Rng): Treasure {
  return pickWeightedTreasure(rng, HOUSE_FINDS.map((id) => getTreasure(id)!));
}

/** 散歩で拾うものを選ぶ。好奇心が高いほどレアが出やすい */
export function pickWalkTreasure(rng: Rng, month: number, curiosity: number): Treasure {
  // レア度は候補ごとではなく一度だけ抽選し、8〜20.5% に保つ。
  const rareChance = (64 + Math.max(0, Math.min(100, curiosity))) / 800;
  const rarity: Rarity = rng() < rareChance ? "rare" : "common";
  const pool = TREASURES.filter(
    (t) => (!t.months || t.months.includes(month)) && t.rarity === rarity,
  );
  return pickWeightedTreasure(rng, pool);
}

export const RARITY_RANK: Record<Rarity, number> = { common: 1, rare: 2 };
