// 素材の一覧（仕様書 5.2・D13）。
// 素材は 1 つずつ個別のファイルにして、フォルダごとに自動で読み込む。ファイル名（拡張子なし）が ID。
// 新しい家具・着せ替え・飾りなどを足すときは、対応するフォルダに `<ID>.ts` を 1 つ置いて
// `export default` で絵を書くだけでよい（sim 側の一覧にも ID を足すこと。テストで抜けを確かめている）。

import type { Feature } from "@pocco/sim";
import type { AccessoryArt, ClothesArt, PatternArt, RoomPartArt, Sprite } from "../sprite.ts";
import type { SpeciesArt } from "./pet/body.ts";
import type { PoseArt, PoseName } from "./pet/pose.ts";

/** import.meta.glob の結果を「ファイル名 → 中身」にする */
function byId<T>(modules: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [file, value] of Object.entries(modules)) {
    out[file.slice(file.lastIndexOf("/") + 1).replace(/\.ts$/, "")] = value;
  }
  return out;
}

// ペット
export const FEATURES = byId(import.meta.glob<Sprite>("./pet/features/*.ts", { eager: true, import: "default" })) as Record<Exclude<Feature, "none">, Sprite>;
export const SPECIES_ART = byId(import.meta.glob<SpeciesArt>("./pet/species/*.ts", { eager: true, import: "default" }));
export const POSES = byId(import.meta.glob<PoseArt>("./pet/poses/*.ts", { eager: true, import: "default" })) as Record<PoseName, PoseArt>;
export { bodySprite, type SpeciesArt, type Eyes, type Mouth } from "./pet/body.ts";
export type { PoseArt, PoseFrame, PoseName } from "./pet/pose.ts";
export { default as EGG } from "./pet/egg.ts";
export { default as GLASSES } from "./pet/glasses.ts";

// 着せ替え
export const HAT_SPRITES = byId(import.meta.glob<Sprite>("./wear/hat/*.ts", { eager: true, import: "default" }));
export const CLOTHES = byId(import.meta.glob<ClothesArt>("./wear/clothes/*.ts", { eager: true, import: "default" }));
export const ACCESSORY_SPRITES = byId(import.meta.glob<AccessoryArt>("./wear/accessory/*.ts", { eager: true, import: "default" }));
export const HAND_SPRITES = byId(import.meta.glob<Sprite>("./wear/hand/*.ts", { eager: true, import: "default" }));

// 部屋
export const FURNITURE_SPRITES = byId(import.meta.glob<Sprite>("./furniture/*.ts", { eager: true, import: "default" }));
export const WALLPAPER_PATTERNS = byId(import.meta.glob<PatternArt>("./room/wallpaper/*.ts", { eager: true, import: "default" }));
export const FLOOR_PATTERNS = byId(import.meta.glob<PatternArt>("./room/floor/*.ts", { eager: true, import: "default" }));
export const ROOM_PARTS = byId(import.meta.glob<RoomPartArt>("./room/*.ts", { eager: true, import: "default" })) as Record<"window" | "fridge" | "bed" | "rug", RoomPartArt>;
export const LITTER = byId(import.meta.glob<Sprite>("./litter/*.ts", { eager: true, import: "default" }));

// 小物・演出
export { default as NOTE } from "./objects/note.ts";
export { default as KEEPSAKE } from "./objects/keepsake.ts";
export { default as ZZZ } from "./effects/zzz.ts";
export { default as SPARKLE } from "./effects/sparkle.ts";
export { default as HEART } from "./effects/heart.ts";
export { default as ANGER } from "./effects/anger.ts";

// ミニゲーム
export { default as SNACK } from "./minigame/snack.ts";
export { default as PAPER } from "./minigame/paper.ts";
export { default as NOTE_SPRITE } from "./minigame/note.ts";
