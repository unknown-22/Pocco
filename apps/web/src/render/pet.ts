// ペットの姿（体・服・頭の飾り・帽子・アクセサリ・手に持つ物）を描く。
// 部屋・肖像・写真で共通に使う。

import { getSpecies, type Equipped } from "@pocco/sim";
import {
  ACCESSORY_SPRITES,
  ANGER,
  CLOTHES,
  FEATURES,
  GLASSES,
  HAND_SPRITES,
  HAT_SPRITES,
  HEART,
  POSES,
  SPECIES_ART,
  bodySprite,
  type PoseFrame,
  type PoseName,
} from "./assets/index.ts";
import { blink, drawSprite, type DrawPalette, type Sprite } from "./sprite.ts";

export interface PetLook {
  speciesId: string;
  stage: string;
  equipped: Equipped;
  /** 目を閉じる（まばたき・最後の場面） */
  eyesClosed?: boolean;
  /** 動き（assets/pet/poses/）。省略すると待機 */
  pose?: PoseName;
  /** 動きのコマを決める時刻（ミリ秒）。省略すると最初のコマ */
  t?: number;
}

const MARKS = { heart: HEART, anger: ANGER };

/** その時刻の動きのコマ */
export function poseFrame(pose: PoseName, t: number): PoseFrame {
  const art = POSES[pose] ?? POSES.idle;
  const n = art.frames.length;
  // 負の時刻でも正しいコマになるように
  return art.frames[((Math.floor(t / art.frameMs) % n) + n) % n]!;
}

/** まばたきする動きか */
export const poseBlinks = (pose: PoseName) => Boolean((POSES[pose] ?? POSES.idle).blink);

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 服を着せた体のスプライト */
function dressed(body: Sprite, clothesId: string | undefined): Sprite {
  const c = clothesId ? CLOTHES[clothesId] : undefined;
  if (!c) return body;
  const h = body.rows.length;
  const rows = body.rows.map((row, y) => {
    if (y < Math.floor(h * c.from) || y >= Math.ceil(h * c.to)) return row;
    return row.replace(/[Bh]/g, "C").replace(/b/g, "c");
  });
  return { rows, colors: { ...body.colors, C: c.color, c: c.shade } };
}

/**
 * 体の中心 cx、足もと bottom に描く。返り値は当たり判定用の範囲（飾りを含む）。
 */
export function drawPet(ctx: CanvasRenderingContext2D, look: PetLook, cx: number, bottom: number, p: DrawPalette): Box {
  const species = getSpecies(look.speciesId);
  const senior = look.stage === "senior" || look.stage === "final_day" || look.stage === "departed";
  const bodyStage = look.stage === "departed" ? "adult" : look.stage;
  const art = SPECIES_ART[look.speciesId] ?? {};
  const frame = poseFrame(look.pose ?? "idle", look.t ?? 0);
  const eyes = look.eyesClosed ? "closed" : (frame.eyes ?? "open");
  let body = bodySprite(bodyStage, art, { eyes, mouth: frame.mouth, squash: frame.squash });
  if (look.eyesClosed && art.sprites?.[bodyStage]) body = blink(body);
  const sprite = dressed(body, look.equipped.clothes);
  const w = sprite.rows[0]!.length;
  const h = sprite.rows.length;
  const px = Math.round(cx - w / 2) + (frame.dx ?? 0);
  bottom += frame.dy ?? 0;
  const py = bottom - h;
  let top = py;

  // 歩くときの足（体のすぐ下に、片方ずつ）
  if (frame.foot) {
    const fx = frame.foot === "left" ? px + Math.round(w * 0.25) : px + w - Math.round(w * 0.25) - 3;
    ctx.fillStyle = p.bodyLine;
    ctx.fillRect(fx, bottom, 3, 1);
  }

  drawSprite(ctx, sprite, px, py, p);
  // 眼鏡・アクセサリの高さは、目をあけているときの目の位置に合わせる
  const eyeY = Math.max(0, bodySprite(bodyStage, art, { squash: frame.squash }).rows.findIndex((r) => r.includes("e")));

  if (!look.equipped.hat && species.feature !== "none") {
    const f = FEATURES[species.feature];
    const fy = py - f.rows.length + 1;
    drawSprite(ctx, f, px + Math.round((w - f.rows[0]!.length) / 2), fy, p);
    top = Math.min(top, fy);
  }

  const acc = look.equipped.accessory ? ACCESSORY_SPRITES[look.equipped.accessory] : undefined;
  const eyesShown = eyes === "open" || eyes === "angry";
  if (senior && eyesShown && acc?.anchor !== "eyes") {
    drawSprite(ctx, GLASSES, px + Math.round((w - GLASSES.rows[0]!.length) / 2), py + eyeY - 1, p);
  }
  if (acc) {
    const aw = acc.sprite.rows[0]!.length;
    const pos = {
      headRight: { x: px + w - aw - 1, y: py - 1 },
      headLeft: { x: px + 2, y: py },
      eyes: { x: px + Math.round((w - aw) / 2), y: py + eyeY - 1 },
      mouth: { x: px + Math.round((w - aw) / 2), y: py + eyeY + 2 },
    }[acc.anchor];
    if (!(acc.anchor === "eyes" && !eyesShown)) drawSprite(ctx, acc.sprite, pos.x, pos.y, p);
    top = Math.min(top, pos.y);
  }

  const hat = look.equipped.hat ? HAT_SPRITES[look.equipped.hat] : undefined;
  if (hat) {
    const hy = py - hat.rows.length + 2;
    drawSprite(ctx, hat, px + Math.round((w - hat.rows[0]!.length) / 2), hy, p);
    top = Math.min(top, hy);
  }

  const hand = look.equipped.hand ? HAND_SPRITES[look.equipped.hand] : undefined;
  if (hand) {
    const hy = py + Math.round(h * 0.6) - hand.rows.length;
    drawSprite(ctx, hand, px + w - 2, hy, p);
    top = Math.min(top, hy);
  }

  if (frame.mark) drawSprite(ctx, MARKS[frame.mark], px + w, top - 3, p);

  return { x: px, y: top, w, h: py + h - top };
}
