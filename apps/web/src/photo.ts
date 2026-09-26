// 写真（仕様書 10.10）。部屋の Canvas をドットのまま大きくして PNG にする。

import { getSpecies, type RoomState } from "@pocco/sim";
import { paletteFor, withSpecies } from "./render/palette.ts";
import { drawRoom, FLOOR_Y, ROOM_SIZE } from "./render/room.ts";
import { drawPet } from "./render/pet.ts";
import { KEEPSAKE, drawSprite } from "./render/sprites.ts";

/** 書き出すときの倍率（128px → 768px） */
const EXPORT_SCALE = 6;

let roomCanvas: HTMLCanvasElement | null = null;

export function setRoomCanvas(canvas: HTMLCanvasElement | null) {
  roomCanvas = canvas;
}

function upscale(source: HTMLCanvasElement): Promise<Blob> {
  const out = document.createElement("canvas");
  out.width = ROOM_SIZE * EXPORT_SCALE;
  out.height = ROOM_SIZE * EXPORT_SCALE;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0, out.width, out.height);
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

export async function uploadPhoto(blob: Blob, opts: { kind?: "snap" | "farewell"; petId?: string; caption?: string } = {}) {
  const form = new FormData();
  form.set("file", new File([blob], "pocco.png", { type: "image/png" }));
  if (opts.kind) form.set("kind", opts.kind);
  if (opts.petId) form.set("petId", opts.petId);
  if (opts.caption) form.set("caption", opts.caption);
  const res = await fetch("/api/photos", { method: "POST", body: form });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
