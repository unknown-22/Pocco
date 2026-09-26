// 着せ替え（仕様書 10.7）と部屋の模様替え（10.8）のマスタ。

import type { Personality } from "./types.ts";

export type WearSlot = "hat" | "clothes" | "accessory" | "hand";
export type WearStyle = "cute" | "cool" | "funny" | "natural";

export interface Wearable {
  id: string;
  name: string;
  icon: string;
  slot: WearSlot;
  style: WearStyle;
  /** 図鑑のごほうびでしか手に入らない */
  rewardOnly?: boolean;
}

export const WEAR_SLOT_LABEL: Record<WearSlot, string> = {
  hat: "ぼうし",
  clothes: "ふく",
  accessory: "アクセサリ",
  hand: "てにもつ",
};

export const WEAR_STYLE_LABEL: Record<WearStyle, string> = {
  cute: "かわいい",
  cool: "かっこいい",
  funny: "おもしろい",
  natural: "ナチュラル",
};

export const WEARABLES: Wearable[] = [
  { id: "straw_hat", name: "むぎわら帽子", icon: "👒", slot: "hat", style: "natural" },
  { id: "beret", name: "ベレー帽", icon: "🎨", slot: "hat", style: "cool" },
  { id: "knit_cap", name: "ニット帽", icon: "🧶", slot: "hat", style: "cute" },
  { id: "party_hat", name: "パーティー帽", icon: "🎉", slot: "hat", style: "funny" },
  { id: "crown_gold", name: "きんのおうかん", icon: "👑", slot: "hat", style: "cool", rewardOnly: true },
  { id: "scarf_red", name: "赤いマフラー", icon: "🧣", slot: "clothes", style: "cute" },
  { id: "overalls", name: "オーバーオール", icon: "👖", slot: "clothes", style: "natural" },
  { id: "cape", name: "マント", icon: "🦸", slot: "clothes", style: "cool" },
  { id: "raincoat", name: "レインコート", icon: "🧥", slot: "clothes", style: "funny" },
  { id: "ribbon", name: "リボン", icon: "🎀", slot: "accessory", style: "cute" },
  { id: "round_glasses", name: "まるめがね", icon: "👓", slot: "accessory", style: "cool" },
  { id: "mustache", name: "つけひげ", icon: "🥸", slot: "accessory", style: "funny" },
  { id: "flower", name: "はなかざり", icon: "🌼", slot: "accessory", style: "natural" },
  { id: "balloon", name: "ふうせん", icon: "🎈", slot: "hand", style: "funny" },
  { id: "flag", name: "はた", icon: "🚩", slot: "hand", style: "cool" },
  { id: "lollipop", name: "ぺろぺろキャンディ", icon: "🍭", slot: "hand", style: "cute" },
];

/** 成長のお祝いや散歩で手に入る着せ替え */
export const GIFT_WEARABLES = WEARABLES.filter((w) => !w.rewardOnly);

/** スタイルごとに、どんな性格が好むか */
const STYLE_TASTE: Record<WearStyle, Partial<Personality>> = {
  cute: { attachment: 1 },
  cool: { attachment: -0.6, tidiness: 0.6 },
  funny: { energy: 0.7, curiosity: 0.5 },
  natural: { energy: -0.6, curiosity: 0.4 },
};

/** 着せたときの好み（-100〜100 くらい）。性格＋生まれつきの好み */
export function wearAffinity(p: Personality, innate: Partial<Record<WearStyle, number>>, item: Wearable): number {
  const taste = Object.entries(STYLE_TASTE[item.style]) as [keyof Personality, number][];
  const norm = Math.sqrt(taste.reduce((s, [, w]) => s + w * w, 0));
  return taste.reduce((s, [axis, w]) => s + w * p[axis], 0) / norm + (innate[item.style] ?? 0);
}

export type FurnitureKind = "wall" | "floor";

export interface Furniture {
  id: string;
  name: string;
  icon: string;
  kind: FurnitureKind;
  /** 置くと見つけやすくなる趣味 */
  hobby?: string;
  /** ペットがこの家具を使ったときの日記 */
  useTexts: string[];
}

export const FURNITURE: Furniture[] = [
  { id: "plant_pot", name: "植木鉢", icon: "🪴", kind: "floor", hobby: "gardening", useTexts: ["植木鉢に水をあげた。", "植木鉢の葉っぱをつついていた。"] },
  { id: "bookshelf", name: "本棚", icon: "📚", kind: "floor", hobby: "reading", useTexts: ["本棚の本をぱらぱらめくっていた。", "本棚の前で考えごとをしていた。"] },
  { id: "telescope", name: "望遠鏡", icon: "🔭", kind: "floor", hobby: "stargazing", useTexts: ["望遠鏡をのぞいていた。", "望遠鏡で月を見ていた。"] },
  { id: "radio", name: "ラジオ", icon: "📻", kind: "floor", hobby: "music", useTexts: ["ラジオに合わせて体をゆらしていた。", "ラジオの音量を上げたり下げたりしていた。"] },
  { id: "cushion", name: "ビーズクッション", icon: "🛋️", kind: "floor", useTexts: ["ビーズクッションに沈みこんでいた。", "ビーズクッションの上でごろごろしていた。"] },
  { id: "painting", name: "絵", icon: "🖼️", kind: "wall", useTexts: ["壁の絵をじっとながめていた。"] },
  { id: "clock", name: "かけ時計", icon: "🕰️", kind: "wall", useTexts: ["かけ時計の音に耳をすませていた。"] },
  { id: "collection_shelf", name: "かざり棚", icon: "🗃️", kind: "wall", hobby: "collecting", useTexts: ["かざり棚の宝物を並べ直していた。"] },
  { id: "garland", name: "ガーランド", icon: "🎏", kind: "wall", useTexts: ["ガーランドを見上げて、ごきげんだった。"] },
];

/** 家具を置ける場所 */
export const FURNITURE_SLOTS: { id: string; kind: FurnitureKind; label: string }[] = [
  { id: "wall_left", kind: "wall", label: "左のかべ" },
  { id: "wall_right", kind: "wall", label: "右のかべ" },
  { id: "floor_left", kind: "floor", label: "左のゆか" },
  { id: "floor_right", kind: "floor", label: "右のゆか" },
];

export interface Wallpaper {
  id: string;
  name: string;
  pattern: "stripe" | "dots" | "check" | "stars" | "panel";
  base: string;
  accent: string;
}

export const WALLPAPERS: Wallpaper[] = [
  { id: "wall_cream", name: "クリームのしま", pattern: "stripe", base: "#f6e7d0", accent: "#efdcc0" },
  { id: "wall_mint", name: "ミントの水玉", pattern: "dots", base: "#dff3ea", accent: "#bfe6d4" },
  { id: "wall_pink", name: "ピンクのチェック", pattern: "check", base: "#fbe3ea", accent: "#f5cdd9" },
  { id: "wall_night", name: "よぞら", pattern: "stars", base: "#3f4a8a", accent: "#fff4b8" },
  { id: "wall_wood", name: "木のパネル", pattern: "panel", base: "#e2c29c", accent: "#cfa97f" },
];

export interface Flooring {
  id: string;
  name: string;
  pattern: "planks" | "tiles" | "carpet";
  base: string;
  accent: string;
}

export const FLOORS: Flooring[] = [
  { id: "floor_wood", name: "木の床", pattern: "planks", base: "#dba97c", accent: "#c48f62" },
  { id: "floor_tile", name: "タイル", pattern: "tiles", base: "#e4e8ee", accent: "#c9d0da" },
  { id: "floor_carpet", name: "カーペット", pattern: "carpet", base: "#b9a4d6", accent: "#a58fc6" },
  { id: "floor_tatami", name: "たたみ", pattern: "planks", base: "#cfd49a", accent: "#b3b97c" },
];

export const getWearable = (id: string) => WEARABLES.find((w) => w.id === id);
export const getFurniture = (id: string) => FURNITURE.find((f) => f.id === id);
export const getWallpaper = (id: string) => WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0]!;
export const getFloor = (id: string) => FLOORS.find((f) => f.id === id) ?? FLOORS[0]!;

/** 最初から持っている模様替え・着せ替え */
export const STARTER_DECOR: { itemId: string; kind: string }[] = [
  { itemId: "wall_cream", kind: "wallpaper" },
  { itemId: "floor_wood", kind: "floor" },
  { itemId: "plant_pot", kind: "furniture" },
  { itemId: "straw_hat", kind: "wear" },
];
