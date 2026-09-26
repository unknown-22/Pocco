// 図鑑の達成率に応じたごほうび（仕様書 10.9）。

import {
  REWARDS,
  completionRate,
  getFloor,
  getFurniture,
  getWallpaper,
  getWearable,
  type Reward,
} from "@pocco/sim";
import type { DB } from "./db.ts";
import { addItem, getCollection, getMeta, insertEvents, recordDiscovery } from "./repo.ts";

export function rewardName(r: Reward): string {
  switch (r.kind) {
    case "wear":
      return getWearable(r.itemId)?.name ?? r.itemId;
    case "furniture":
      return getFurniture(r.itemId)?.name ?? r.itemId;
    case "wallpaper":
      return `壁紙「${getWallpaper(r.itemId).name}」`;
    case "floor":
      return `床「${getFloor(r.itemId).name}」`;
  }
}

/** 達成率が節目を越えていたら、まだもらっていないごほうびを渡す */
export function grantRewards(db: DB, now: number) {
  const meta = getMeta(db);
  if (!meta?.currentPetId) return;
  const collection = getCollection(db);
  const rate = completionRate(collection);
  const granted = new Set(collection.filter((c) => c.category === "reward").map((c) => c.entryId));
  for (const r of REWARDS) {
    if (rate < r.at || granted.has(String(r.at))) continue;
    recordDiscovery(db, "reward", String(r.at), now);
    addItem(db, r.itemId, r.kind, 1, now);
    insertEvents(db, meta.currentPetId, meta.timezone, [
      {
        at: now,
        eventId: "reward",
        kind: "user",
        importance: "rare",
        text: `図鑑が ${r.at}% になった！ ごほうびに${rewardName(r)}をもらった。`,
      },
    ]);
  }
}
