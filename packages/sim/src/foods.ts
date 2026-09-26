// 食べ物のマスタ（仕様書 10.1）。アイコンは仮の絵文字で、P6 でドット絵に差し替える。

export const TASTE_TAGS = ["sweet", "salty", "spicy", "veggie", "meat", "fish", "mystery"] as const;
export type TasteTag = (typeof TASTE_TAGS)[number];

export const TASTE_LABEL: Record<TasteTag, string> = {
  sweet: "あまいもの",
  salty: "しょっぱいもの",
  spicy: "からいもの",
  veggie: "やさい",
  meat: "おにく",
  fish: "おさかな",
  mystery: "なぞの食べ物",
};

export interface Food {
  id: string;
  name: string;
  icon: string;
  tags: TasteTag[];
  /** 空腹をどれだけ減らすか */
  fullness: number;
  /** 食べたときにどれだけ散らかるか */
  mess: number;
}

export const FOODS: Food[] = [
  { id: "apple", name: "りんご", icon: "🍎", tags: ["sweet", "veggie"], fullness: 20, mess: 3 },
  { id: "tomato", name: "トマト", icon: "🍅", tags: ["veggie"], fullness: 15, mess: 6 },
  { id: "carrot", name: "にんじん", icon: "🥕", tags: ["veggie"], fullness: 15, mess: 2 },
  { id: "rice_ball", name: "おにぎり", icon: "🍙", tags: ["salty"], fullness: 35, mess: 3 },
  { id: "bread", name: "パン", icon: "🍞", tags: ["salty"], fullness: 30, mess: 6 },
  { id: "cookie", name: "クッキー", icon: "🍪", tags: ["sweet"], fullness: 15, mess: 8 },
  { id: "pudding", name: "プリン", icon: "🍮", tags: ["sweet"], fullness: 20, mess: 4 },
  { id: "cake", name: "ケーキ", icon: "🍰", tags: ["sweet"], fullness: 25, mess: 12 },
  { id: "sausage", name: "ウインナー", icon: "🌭", tags: ["meat", "salty"], fullness: 30, mess: 4 },
  { id: "hamburg", name: "ハンバーグ", icon: "🍖", tags: ["meat"], fullness: 45, mess: 8 },
  { id: "grilled_fish", name: "焼き魚", icon: "🐟", tags: ["fish", "salty"], fullness: 35, mess: 6 },
  { id: "sushi", name: "おすし", icon: "🍣", tags: ["fish"], fullness: 35, mess: 3 },
  { id: "curry", name: "カレー", icon: "🍛", tags: ["spicy", "meat"], fullness: 45, mess: 14 },
  { id: "chili", name: "とうがらし", icon: "🌶️", tags: ["spicy", "veggie"], fullness: 5, mess: 2 },
  { id: "mushroom", name: "なぞのきのこ", icon: "🍄", tags: ["mystery", "veggie"], fullness: 15, mess: 4 },
  { id: "natto", name: "なっとう", icon: "🫘", tags: ["mystery", "salty"], fullness: 25, mess: 10 },
];

const byId = new Map(FOODS.map((f) => [f.id, f]));
export const getFood = (id: string) => byId.get(id);

/** 最初に持っている食べ物 */
export const STARTER_FOODS: Record<string, number> = { apple: 3, rice_ball: 3, bread: 2, cookie: 2 };

/** 食べ物への好感度（タグの平均） */
export function foodAffinity(prefs: Partial<Record<string, number>>, food: Food): number {
  return food.tags.reduce((sum, tag) => sum + (prefs[tag] ?? 0), 0) / food.tags.length;
}
