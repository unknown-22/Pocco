// 図鑑（仕様書 10.9）。種族・食べ物・拾い物・趣味・イベントを集める。
// 達成率に応じて、着せ替えや家具がもらえる。

import { FOODS } from "./foods.ts";
import { HOBBIES } from "./hobbies.ts";
import { TREASURES } from "./items.ts";
import { SPECIES } from "./species.ts";
import type { TimelineEvent } from "./types.ts";

export type CollectionCategory = "species" | "food" | "treasure" | "hobby" | "event";

export const CATEGORY_LABEL: Record<CollectionCategory, string> = {
  species: "しゅぞく",
  food: "たべもの",
  treasure: "ひろいもの",
  hobby: "しゅみ",
  event: "できごと",
};

export interface EventEntry {
  id: string;
  name: string;
  icon: string;
  hint: string;
}

export const EVENT_ENTRIES: EventEntry[] = [
  { id: "hatch", name: "たまごがかえった", icon: "🐣", hint: "たまごを見守ろう" },
  { id: "first_walk", name: "はじめての散歩", icon: "🚶", hint: "しばらく留守にしてみよう" },
  { id: "walk_rare", name: "散歩でめずらしい物", icon: "🌟", hint: "好奇心が強いと…" },
  { id: "find", name: "部屋で見つけた宝物", icon: "✨", hint: "部屋のすみに何かあるかも" },
  { id: "fridge", name: "冷蔵庫をこっそり", icon: "🧊", hint: "おなかが空いたまま留守にすると…" },
  { id: "mess", name: "部屋をちらかした", icon: "🌀", hint: "たいくつさせると…" },
  { id: "clean_found", name: "掃除で見つけた", icon: "🧹", hint: "ちらかった部屋を掃除しよう" },
  { id: "love_food", name: "大好物", icon: "😋", hint: "好きな味をあげよう" },
  { id: "dislike_food", name: "にがてな味", icon: "😖", hint: "ちょっと苦手なものも…" },
  { id: "wake", name: "おこしちゃった", icon: "⏰", hint: "寝ているときに話しかけると…" },
  { id: "hobby", name: "趣味を見つけた", icon: "🎨", hint: "いろいろなことをさせてみよう" },
  { id: "evolve", name: "進化", icon: "⭐", hint: "大きくなるのを待とう" },
  { id: "senior", name: "シニアになった", icon: "👓", hint: "長く一緒にいよう" },
  { id: "farewell", name: "旅立ち", icon: "🕊️", hint: "いつかは訪れる" },
  { id: "new_egg", name: "つぎの世代", icon: "🥚", hint: "旅立ちのあとに…" },
  { id: "gift", name: "おすそわけ", icon: "🎁", hint: "毎日開いてみよう" },
];

/** 日記の出来事が、図鑑のどのイベントにあたるか */
export function eventEntryOf(e: Pick<TimelineEvent, "eventId" | "importance">): string | null {
  switch (e.eventId) {
    case "hatch":
      return "hatch";
    case "out_start":
      return "first_walk";
    case "walk_end":
      return e.importance === "rare" ? "walk_rare" : null;
    case "find":
      return "find";
    case "eat":
      return "fridge";
    case "mess":
      return "mess";
    case "clean_found":
      return "clean_found";
    case "feed_love":
      return "love_food";
    case "feed_dislike":
      return "dislike_food";
    case "wake":
      return "wake";
    case "hobby_found":
      return "hobby";
    case "evolve":
      return "evolve";
    case "stage_senior":
      return "senior";
    case "departed":
      return "farewell";
    case "new_egg":
      return "new_egg";
    case "gift":
      return "gift";
    default:
      return null;
  }
}

/** 各カテゴリの全エントリの ID */
export function collectionCatalog(): Record<CollectionCategory, string[]> {
  return {
    species: SPECIES.filter((s) => s.id !== "egg").map((s) => s.id),
    food: FOODS.map((f) => f.id),
    treasure: TREASURES.map((t) => t.id),
    hobby: HOBBIES.map((h) => h.id),
    event: EVENT_ENTRIES.map((e) => e.id),
  };
}

export interface Reward {
  /** 達成率（%） */
  at: number;
  itemId: string;
  kind: "wear" | "furniture" | "wallpaper" | "floor";
}

export const REWARDS: Reward[] = [
  { at: 10, itemId: "wall_mint", kind: "wallpaper" },
  { at: 15, itemId: "ribbon", kind: "wear" },
  { at: 20, itemId: "bookshelf", kind: "furniture" },
  { at: 30, itemId: "floor_tile", kind: "floor" },
  { at: 40, itemId: "telescope", kind: "furniture" },
  { at: 50, itemId: "cape", kind: "wear" },
  { at: 60, itemId: "wall_night", kind: "wallpaper" },
  { at: 70, itemId: "collection_shelf", kind: "furniture" },
  { at: 85, itemId: "floor_carpet", kind: "floor" },
  { at: 100, itemId: "crown_gold", kind: "wear" },
];

export function completionRate(found: { category: string; entryId: string }[]): number {
  const catalog = collectionCatalog();
  const total = Object.values(catalog).reduce((s, ids) => s + ids.length, 0);
  const valid = found.filter((f) => (catalog as Record<string, string[]>)[f.category]?.includes(f.entryId)).length;
  return Math.floor((valid / total) * 100);
}
