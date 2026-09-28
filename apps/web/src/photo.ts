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
/** 部屋の上に重ねている吹き出し（HTML）。写真に焼き込む */
let roomBubble: HTMLElement | null = null;

export function setRoomCanvas(canvas: HTMLCanvasElement | null, bubble: HTMLElement | null = null) {
  roomCanvas = canvas;
  roomBubble = bubble;
}

/** 自撮りで切り抜く範囲（部屋の座標。64px 四方を 2 倍にして 128px の写真にする） */
const SELFIE_CROP = { x: 28, y: 54, size: 64 };

function upscale(
  source: HTMLCanvasElement,
  crop = { x: 0, y: 0, size: ROOM_SIZE },
  decorate?: (ctx: CanvasRenderingContext2D, out: HTMLCanvasElement) => void,
): Promise<Blob> {
  const out = document.createElement("canvas");
  out.width = ROOM_SIZE * EXPORT_SCALE;
  out.height = ROOM_SIZE * EXPORT_SCALE;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, crop.x, crop.y, crop.size, crop.size, 0, 0, out.width, out.height);
  decorate?.(ctx, out);
  return new Promise((resolve, reject) =>
    out.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}

/** いま見えている部屋を撮る（色あせ・吹き出しなど、画面で重ねている見た目もそのまま写す） */
export function captureRoom(): Promise<Blob> {
  const canvas = roomCanvas;
  if (!canvas) return Promise.reject(new Error("room not visible"));
  const bubble = roomBubble;
  return upscale(canvas, undefined, (ctx, out) => {
    // 最期の日の色あせ（CSS の filter）をかけ直す
    const filter = getComputedStyle(canvas).filter;
    if (filter && filter !== "none" && "filter" in ctx) {
      const copy = document.createElement("canvas");
      copy.width = out.width;
      copy.height = out.height;
      copy.getContext("2d")!.drawImage(out, 0, 0);
      ctx.clearRect(0, 0, out.width, out.height);
      ctx.filter = filter;
      ctx.drawImage(copy, 0, 0);
      ctx.filter = "none";
    }
    if (bubble?.classList.contains("is-visible") && bubble.textContent) drawBubble(ctx, out, canvas, bubble);
  });
}

/** 画面に出ている吹き出しを、見えている位置・大きさのまま写真に描く */
function drawBubble(ctx: CanvasRenderingContext2D, out: HTMLCanvasElement, canvas: HTMLCanvasElement, bubble: HTMLElement) {
  const cr = canvas.getBoundingClientRect();
  const br = bubble.getBoundingClientRect();
  if (cr.width === 0 || br.width === 0) return;
  const f = out.width / cr.width; // 画面の 1px → 写真の px
  const cs = getComputedStyle(bubble);
  const text = bubble.textContent!;
  const radius = parseFloat(cs.borderTopLeftRadius) * f || 0;
  const tail = 6 * f; // .bubble::after の三角

  ctx.save();
  let fontSize = parseFloat(cs.fontSize) * f;
  ctx.font = `${fontSize}px ${cs.fontFamily}`;
  const padX = parseFloat(cs.paddingLeft) * f;
  // 画面では拡大の途中でも、写真は吹き出しが出きった大きさで描く
  let w = Math.max(ctx.measureText(text).width + padX * 2, br.width * f);
  const h = Math.max(fontSize * 1.2 + parseFloat(cs.paddingTop) * f * 2, 0);
  if (w > out.width - 8) {
    // 長い言葉は写真からはみ出さないように文字を小さくする
    fontSize *= (out.width - 8 - padX * 2) / (w - padX * 2);
    ctx.font = `${fontSize}px ${cs.fontFamily}`;
    w = out.width - 8;
  }
  // 吹き出しの先（ペットの頭の上）を基準に置き、写真の中に収める
  const anchorX = (br.left + br.width / 2 - cr.left) * f;
  const bottom = (br.bottom - cr.top) * f + (br.height * f - h) / 2;
  const x = Math.min(Math.max(anchorX - w / 2, 4), out.width - w - 4);
  const y = Math.min(Math.max(bottom - h, 4), out.height - h - tail - 4);
  const tailX = Math.min(Math.max(anchorX, x + radius + tail), x + w - radius - tail);

  ctx.shadowColor = "rgba(74, 54, 86, 0.2)";
  ctx.shadowBlur = 10 * f;
  ctx.shadowOffsetY = 3 * f;
  ctx.fillStyle = cs.backgroundColor;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, radius);
  else ctx.rect(x, y, w, h);
  ctx.moveTo(tailX - tail, y + h);
  ctx.lineTo(tailX, y + h + tail);
  ctx.lineTo(tailX + tail, y + h);
  ctx.closePath();
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.fillStyle = cs.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + w / 2, y + h / 2);
  ctx.restore();
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
  // にっこり（poses/play.ts の笑顔のコマ）
  const box = drawPet(ctx, { speciesId: selfie.speciesId, stage: selfie.stage, equipped: selfie.equipped, pose: "play", t: 800 }, cx, bottom, p);
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
