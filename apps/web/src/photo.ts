// 写真（仕様書 10.10）。部屋の Canvas をドットのまま大きくして PNG にする。

import { getSpecies, localHour, type RoomState, type Selfie } from "@pocco/sim";
import { paletteFor, withSpecies } from "./render/palette.ts";
import { drawRoom, FLOOR_Y, ROOM_SIZE } from "./render/room.ts";
import { drawPet } from "./render/pet.ts";
import { drawSprite } from "./render/sprite.ts";
import { KEEPSAKE, SPARKLE } from "./render/assets/index.ts";
import { dayPeriod } from "./time.ts";

/** 書き出すときの倍率（128px → 768px） */
const EXPORT_SCALE = 6;

let roomCanvas: HTMLCanvasElement | null = null;

export function setRoomCanvas(canvas: HTMLCanvasElement | null) {
  roomCanvas = canvas;
}

/** 自撮りで切り抜く範囲（部屋の座標。64px 四方を 2 倍にして 128px の写真にする） */
const SELFIE_CROP = { x: 28, y: 54, size: 64 };

function upscale(source: HTMLCanvasElement, crop = { x: 0, y: 0, size: ROOM_SIZE }): Promise<Blob> {
  const out = document.createElement("canvas");
  out.width = ROOM_SIZE * EXPORT_SCALE;
  out.height = ROOM_SIZE * EXPORT_SCALE;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, crop.x, crop.y, crop.size, crop.size, 0, 0, out.width, out.height);
  return new Promise((resolve, reject) =>
    out.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}

/** いま見えている部屋を撮る */
export function captureRoom(): Promise<Blob> {
  if (!roomCanvas) return Promise.reject(new Error("room not visible"));
  return upscale(roomCanvas);
}

/** 最後の場面（夕方の部屋、ベッドで目を閉じている姿）を描いて撮る（仕様書 7.3） */
export function composeFarewellScene(room: RoomState, speciesId: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = ROOM_SIZE;
  canvas.height = ROOM_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  const p = withSpecies(paletteFor("evening"), "evening", getSpecies(speciesId).colors, true);
  drawRoom(ctx, p, false, room);
  if (room.keepsakeItemId) drawSprite(ctx, KEEPSAKE, 76, 43, p);
  drawPet(ctx, { speciesId, stage: "senior", equipped: {}, eyesClosed: true }, 108, FLOOR_Y + 6, p);
  return upscale(canvas);
}

/**
 * ペットが留守中に撮った自撮り（仕様書 10.10）。そのときの時間帯の部屋で、
 * ラグの上のペットに寄った写真にする。部屋の模様は開いたときのもの。
 */
export function composeSelfie(room: RoomState, selfie: Selfie, timezone: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = ROOM_SIZE;
  canvas.height = ROOM_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  const period = dayPeriod(localHour(selfie.at, timezone));
  const senior = selfie.stage === "senior" || selfie.stage === "final_day";
  const p = withSpecies(paletteFor(period), period, getSpecies(selfie.speciesId).colors, senior);
  drawRoom(ctx, p, period === "night", room);
  if (room.keepsakeItemId) drawSprite(ctx, KEEPSAKE, 76, 43, p);
  const cx = SELFIE_CROP.x + SELFIE_CROP.size / 2;
  const bottom = FLOOR_Y + 22;
  ctx.fillStyle = p.shadow;
  ctx.fillRect(cx - 6, bottom - 1, 12, 2);
  const box = drawPet(ctx, { speciesId: selfie.speciesId, stage: selfie.stage, equipped: selfie.equipped }, cx, bottom, p);
  // カメラのきらっ
  drawSprite(ctx, SPARKLE, box.x - 7, box.y + 2, p);
  drawSprite(ctx, SPARKLE, box.x + box.w + 2, box.y - 4, p);
  return upscale(canvas, SELFIE_CROP);
}

export async function uploadPhoto(
  blob: Blob,
  opts: { kind?: "snap" | "farewell" | "selfie"; petId?: string; caption?: string; selfieAt?: number } = {},
) {
  const form = new FormData();
  form.set("file", new File([blob], "pocco.png", { type: "image/png" }));
  if (opts.kind) form.set("kind", opts.kind);
  if (opts.petId) form.set("petId", opts.petId);
  if (opts.caption) form.set("caption", opts.caption);
  if (opts.selfieAt !== undefined) form.set("selfieAt", String(opts.selfieAt));
  const res = await fetch("/api/photos", { method: "POST", body: form });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
