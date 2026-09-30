import { describe, expect, it } from "vitest";
import { HOUSE_FINDS, TREASURES, pickHouseTreasure, pickWalkTreasure } from "../src/items.ts";
import { createRng } from "../src/rng.ts";

const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

describe("拾い物の重み", () => {
  it("全アイテムに正の重みがあり、鍵は日用品より珍しい", () => {
    for (const item of TREASURES) expect(item.findWeight).toBeGreaterThan(0);
    const key = TREASURES.find((item) => item.id === "key")!;
    for (const id of HOUSE_FINDS.filter((id) => id !== "key")) {
      expect(TREASURES.find((item) => item.id === id)!.findWeight).toBeGreaterThan(key.findWeight);
    }
  });

  it("部屋の抽選はコイン20・ボタン40・ビー玉30・鍵1の比率になる", () => {
    const counts: Record<string, number> = {};
    // 各重みの区間を均等に通る固定入力。統計的な偶然には依存しない。
    for (let i = 0; i < 9100; i++) {
      const item = pickHouseTreasure(() => (i + 0.5) / 9100);
      counts[item.id] = (counts[item.id] ?? 0) + 1;
    }
    expect(counts).toEqual({ coin: 2000, button: 4000, marble: 3000, key: 100 });
  });

  it("散歩ではレア度を一度だけ決めてから重み付きで選ぶ", () => {
    let calls = 0;
    const rng = () => { calls++; return 0; };
    expect(pickWalkTreasure(rng, 1, 0).rarity).toBe("rare");
    expect(calls).toBe(2);
    expect(pickWalkTreasure(sequence(0.079, 0), 1, 0).rarity).toBe("rare");
    expect(pickWalkTreasure(sequence(0.08, 0), 1, 0).rarity).toBe("common");
    expect(pickWalkTreasure(sequence(0.204, 0), 1, 100).rarity).toBe("rare");
    expect(pickWalkTreasure(sequence(0.205, 0), 1, 100).rarity).toBe("common");
    expect(pickWalkTreasure(sequence(0.205, 0), 1, 1000).rarity).toBe("common");
    expect(pickWalkTreasure(sequence(0.08, 0), 1, -100).rarity).toBe("common");
  });

  it("レアの中でも鍵と星は少なく、絵本・楽器・クローバーが多い", () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 1200; i++) {
      const item = pickWalkTreasure(sequence(0, (i + 0.5) / 1200), 1, 0);
      counts[item.id] = (counts[item.id] ?? 0) + 1;
    }
    expect(counts).toEqual({ picture_book: 300, harmonica: 300, clover: 400, key: 100, star_piece: 100 });
  });

  it("季節外のものを返さず、乱数の両端でも必ずアイテムを返す", () => {
    for (let month = 1; month <= 12; month++) {
      for (const rarityRoll of [0, 0.999999]) {
        for (let i = 0; i <= 100; i++) {
          const item = pickWalkTreasure(sequence(rarityRoll, i === 100 ? 0.999999 : i / 100), month, 0);
          expect(item).toBeDefined();
          expect(!item.months || item.months.includes(month)).toBe(true);
        }
      }
    }
    expect(pickHouseTreasure(() => 0).id).toBe("coin");
    expect(pickHouseTreasure(() => 0.999999).id).toBe("key");
  });

  it("同じシードなら同じ拾い物の列になる", () => {
    const draw = () => {
      const rng = createRng(20260930);
      return Array.from({ length: 100 }, () => [pickHouseTreasure(rng).id, pickWalkTreasure(rng, 9, 50).id]);
    };
    expect(draw()).toEqual(draw());
  });
});
