// 持ち物のアイコン（仕様書 5.2）。食べ物・拾い物は専用の絵、着せ替え・家具は部屋で使う絵をそのまま使う。

import { getWearable } from "@pocco/sim";
import {
  ACCESSORY_SPRITES,
  CLOTHES,
  FOOD_SPRITES,
  FURNITURE_SPRITES,
  HAND_SPRITES,
  HAT_SPRITES,
  TREASURE_SPRITES,
} from "./assets/index.ts";
import type { ClothesArt, Sprite } from "./sprite.ts";

export type IconKind = "food" | "treasure" | "wear" | "furniture";

/** 服は体の色を塗りかえる形なので、アイコン用に描く。首まわりだけの服はマフラー、それ以外はシャツの形 */
function clothesIcon(c: ClothesArt): Sprite {
  if (c.to - c.from < 0.2) {
    return {
      rows: [
        ".CCCCCCCC.",
        "CCCCCCCCCC",
        ".cccccCCc.",
        "......CCc.",
        "......CCc.",
        "......c.c.",
      ],
      colors: { c: c.shade, C: c.color },
    };
  }
  return {
    rows: [
      ".cc....cc.",
      "cCCc..cCCc",
      "cCCCccCCCc",
      "ccCCCCCCcc",
      "..cCCCCc..",
      "..cCSSCc..",
      "..cCCCCc..",
      "..cccccc..",
    ],
    colors: { c: c.shade, C: c.color, S: c.stripe ?? c.color },
  };
}

export function iconSprite(kind: IconKind, id: string): Sprite | undefined {
  switch (kind) {
    case "food":
      return FOOD_SPRITES[id];
    case "treasure":
      return TREASURE_SPRITES[id];
    case "furniture":
      return FURNITURE_SPRITES[id];
    case "wear": {
      const slot = getWearable(id)?.slot;
      if (slot === "hat") return HAT_SPRITES[id];
      if (slot === "hand") return HAND_SPRITES[id];
      if (slot === "accessory") return ACCESSORY_SPRITES[id]?.sprite;
      if (slot === "clothes" && CLOTHES[id]) return clothesIcon(CLOTHES[id]);
      return undefined;
    }
  }
}
