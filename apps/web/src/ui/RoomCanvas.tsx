import { useEffect, useRef, useState } from "react";
import { getSpecies, localHour, type Pet, type RoomState } from "@pocco/sim";
import { paletteFor, withSpecies } from "../render/palette.ts";
import { drawRoom, FLOOR_Y, ROOM_SIZE, SLOT_POS } from "../render/room.ts";
import { drawSprite } from "../render/sprite.ts";
import { drawPet, poseBlinks } from "../render/pet.ts";
import type { PoseName } from "../render/assets/index.ts";
import { EGG, FURNITURE_SPRITES, KEEPSAKE, LITTER, NOTE, ZZZ } from "../render/assets/index.ts";
import { setRoomCanvas } from "../photo.ts";
import { dayPeriod } from "../time.ts";
import { serverNow } from "../store.ts";

interface Props {
  pet: Pet;
  room: RoomState;
  timezone: string;
  bubble: { text: string; id: number } | null;
  /** 喜ぶ・怒るなどの反応。id が変わるたびに少しのあいだその動きをする */
  mood: { pose: PoseName; id: number } | null;
  onTapPet: () => void;
  onTapLitter: (id: string) => void;
}

const BUBBLE_MS = 3500;

/** 行動ごとの立ち位置（体の中心の x） */
const SPOT_X: Record<string, number> = { floor: 64, rug: 60, window: 64, fridge: 34, bed: 108 };
/** うろうろできる範囲（体の中心） */
const ROAM: Record<string, [number, number]> = {
  wander: [38, 94],
  play: [42, 80],
  tidy: [38, 94],
};

/**
 * 部屋とペットを描く。サーバーの状態（行動・散らかり・種族）をもとに、
 * 歩く・まばたきなどの細かい動きはクライアント側の演出で付ける（仕様書 4.3）。
 */
/** 反応の動きを続ける長さ */
const MOOD_MS = 2400;

export function RoomCanvas({ pet, room, timezone, bubble, mood: moodProp, onTapPet, onTapLitter }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(3);
  const petX = useRef<number | null>(null);
  /** ペットの当たり判定（部屋の座標） */
  const petBox = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const [visibleBubble, setVisibleBubble] = useState<Props["bubble"]>(null);
  /** いまの反応（描画ループから読むので ref） */
  const mood = useRef<{ pose: PoseName; until: number } | null>(null);

  const stage = pet.state.stage;
  const activity = pet.state.activity;
  const speciesId = pet.state.speciesId;
  const { litter, lightsOff, keepsakeItemId, wallpaperId, floorId, furniture } = room;
  const equipped = pet.state.equipped;
  const equippedKey = JSON.stringify(equipped);
  const furnitureKey = JSON.stringify(furniture);

  // 吹き出しは数秒で消す
  useEffect(() => {
    if (!bubble) return;
    setVisibleBubble(bubble);
    const id = setTimeout(() => setVisibleBubble((b) => (b?.id === bubble.id ? null : b)), BUBBLE_MS);
    return () => clearTimeout(id);
  }, [bubble]);

  useEffect(() => {
    if (moodProp) mood.current = { pose: moodProp.pose, until: performance.now() + MOOD_MS };
  }, [moodProp]);

  // 画面幅に収まる最大の整数倍で拡大する
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setScale(Math.max(1, Math.floor(entry!.contentRect.width / ROOM_SIZE)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * ROOM_SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * ROOM_SIZE;
    const b = petBox.current;
    const pad = 4; // 指で押しやすいように少し広げる
    if (b && x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad) {
      onTapPet();
      return;
    }
    const hit = litter.find((l) => x >= l.x - 3 && x <= l.x + 7 && y >= l.y - 3 && y <= l.y + 7);
    if (hit) onTapLitter(hit.id);
  };

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    setRoomCanvas(canvasRef.current, bubbleRef.current);
    const type = activity.type;
    // 家具を使っているときは、その家具の前
    const slotPos = activity.slot ? SLOT_POS[activity.slot] : undefined;
    const slotSprite = activity.slot ? FURNITURE_SPRITES[furniture[activity.slot] ?? ""] : undefined;
    const home = slotPos
      ? slotPos.x + (slotSprite ? slotSprite.rows[0]!.length / 2 : 6)
      : (SPOT_X[activity.spot ?? "floor"] ?? 64);
    const roam = ROAM[type];
    const walker = { target: home, nextDecision: 0 };
    const asleep = type === "sleep" || type === "nap";
    const onBed = asleep && activity.spot === "bed";
    const absent = type === "out" || stage === "departed";
    if (petX.current === null || asleep) petX.current = home;

    const species = getSpecies(speciesId);
    const senior = stage === "senior" || stage === "final_day";
    const decor = { wallpaperId, floorId, furniture };

    let raf = 0;
    let last = performance.now();

    const frame = (t: number) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      const period = dayPeriod(localHour(serverNow(), timezone));
      const base = paletteFor(period);
      const p = withSpecies(base, period, species.colors, senior);

      ctx.clearRect(0, 0, ROOM_SIZE, ROOM_SIZE);
      drawRoom(ctx, p, period === "night", decor);
      if (keepsakeItemId) drawSprite(ctx, KEEPSAKE, 76, 43, p);
      for (const l of litter) {
        const sprite = LITTER[l.kind];
        if (sprite) drawSprite(ctx, sprite, l.x, l.y, p);
      }

      if (stage === "egg") {
        const wobble = t % 3200 < 600 ? (Math.floor(t / 150) % 2 ? 1 : -1) : 0;
        const x = 58 + wobble;
        const y = FLOOR_Y + 22 - EGG.rows.length;
        ctx.fillStyle = p.shadow;
        ctx.fillRect(x + 1, y + EGG.rows.length - 1, 10, 2);
        drawSprite(ctx, EGG, x, y, p);
        petBox.current = { x, y, w: 12, h: EGG.rows.length };
      } else if (absent) {
        petBox.current = null;
        if (type === "out") drawSprite(ctx, NOTE, 58, 104, p); // おでかけ中の書き置き
      } else {
        // 移動
        let x = petX.current!;
        if (roam && t > walker.nextDecision) {
          walker.target = roam[0] + Math.random() * (roam[1] - roam[0]);
          walker.nextDecision = t + (type === "play" ? 800 : 2500) + Math.random() * 3000;
        } else if (!roam) {
          walker.target = home;
        }
        const dx = walker.target - x;
        const walking = !asleep && Math.abs(dx) > 0.5;
        const speed = type === "play" ? 28 : senior ? 5 : 10;
        if (walking) x += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
        petX.current = x;

        // 見た目（動きは assets/pet/poses/ のコマ）
        const moodPose = mood.current && t < mood.current.until ? mood.current.pose : null;
        const pose: PoseName = asleep
          ? "sleep"
          : moodPose ?? (type === "play" ? "play" : walking ? "walk" : type === "eat" ? "eat" : "idle");
        const eyesClosed = !asleep && poseBlinks(pose) && t % 4000 < 150;
        const bottom = (onBed ? FLOOR_Y + 5 : FLOOR_Y + 22) + (asleep ? 1 : 0);
        if (!onBed) {
          ctx.fillStyle = p.shadow;
          ctx.fillRect(Math.round(x) - 6, FLOOR_Y + 21, 12, 2);
        }
        const box = drawPet(ctx, { speciesId, stage, equipped, eyesClosed, pose, t }, x, bottom, p);
        petBox.current = box;
        const px = box.x;
        const w = box.w;
        if (asleep) {
          const rise = Math.floor(t / 400) % 6;
          drawSprite(ctx, ZZZ, px + w - 2, box.y - 4 - rise, p);
        }
      }

      if (lightsOff) {
        // 電気を消した部屋
        ctx.fillStyle = "rgba(24, 22, 60, 0.55)";
        ctx.fillRect(0, 0, ROOM_SIZE, ROOM_SIZE);
      }

      const bubbleEl = bubbleRef.current;
      const b = petBox.current;
      if (bubbleEl && b) {
        bubbleEl.style.left = `${((b.x + b.w / 2) / ROOM_SIZE) * 100}%`;
        bubbleEl.style.top = `${(b.y / ROOM_SIZE) * 100}%`;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, speciesId, activity.type, activity.spot, activity.slot, litter, lightsOff, keepsakeItemId, timezone, wallpaperId, floorId, furnitureKey, equippedKey]);

  const size = ROOM_SIZE * scale;
  // 最期の日は少し色あせる（仕様書 7.3）
  const fading = stage === "final_day";
  return (
    <div ref={wrapRef} className="room">
      <div className="room-inner" style={{ width: size, height: size }}>
        <canvas
          ref={canvasRef}
          width={ROOM_SIZE}
          height={ROOM_SIZE}
          className={fading ? "is-fading" : undefined}
          style={{ width: size, height: size }}
          aria-label="ペットの部屋（ペットをタップで話しかける、ゴミをタップで片付ける）"
          onClick={onClick}
        />
        <div ref={bubbleRef} className={`bubble pixel${visibleBubble ? " is-visible" : ""}`} aria-live="polite">
          {visibleBubble?.text}
        </div>
      </div>
    </div>
  );
}
