import { useEffect, useRef, useState } from "react";
import { localHour, type Activity, type RoomState, type Stage } from "@pocco/sim";
import { paletteFor } from "../render/palette.ts";
import { drawRoom, FLOOR_Y, ROOM_SIZE } from "../render/room.ts";
import { BABY, EGG, LITTER, ZZZ, blink, drawSprite } from "../render/sprites.ts";
import { dayPeriod } from "../time.ts";
import { serverNow } from "../store.ts";

interface Props {
  stage: Stage;
  activity: Activity;
  litter: RoomState["litter"];
  lightsOff: boolean;
  timezone: string;
  bubble: { text: string; id: number } | null;
  onTapPet: () => void;
  onTapLitter: (id: string) => void;
}

const BUBBLE_MS = 3500;

/** 行動ごとの立ち位置（スプライト左端の x） */
const SPOT_X: Record<string, number> = { floor: 56, rug: 52, window: 56, fridge: 27, bed: 100 };
/** うろうろできる範囲 */
const ROAM: Record<string, [number, number]> = {
  wander: [30, 86],
  play: [34, 72],
  tidy: [30, 86],
};

/**
 * 部屋とペットを描く。サーバーの状態（行動・散らかり）をもとに、
 * 歩く・まばたきなどの細かい動きはクライアント側の演出で付ける（仕様書 4.3）。
 */
export function RoomCanvas({ stage, activity, litter, lightsOff, timezone, bubble, onTapPet, onTapLitter }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(3);
  const petX = useRef<number | null>(null);
  /** ペットの当たり判定（部屋の座標） */
  const petBox = useRef({ x: 0, y: 0, w: 16, h: 16 });
  const [visibleBubble, setVisibleBubble] = useState<Props["bubble"]>(null);

  // 吹き出しは数秒で消す
  useEffect(() => {
    if (!bubble) return;
    setVisibleBubble(bubble);
    const id = setTimeout(() => setVisibleBubble((b) => (b?.id === bubble.id ? null : b)), BUBBLE_MS);
    return () => clearTimeout(id);
  }, [bubble]);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * ROOM_SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * ROOM_SIZE;
    const b = petBox.current;
    const pad = 4; // 指で押しやすいように少し広げる
    if (x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad) {
      onTapPet();
      return;
    }
    const hit = litter.find((l) => x >= l.x - 3 && x <= l.x + 7 && y >= l.y - 3 && y <= l.y + 7);
    if (hit) onTapLitter(hit.id);
  };

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

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const type = activity.type;
    const home = SPOT_X[activity.spot ?? "floor"] ?? 56;
    const roam = ROAM[type];
    const walker = { target: home, nextDecision: 0 };
    if (petX.current === null) petX.current = home;
    const asleep = type === "sleep" || type === "nap";
    const onBed = type === "sleep";
    if (asleep) petX.current = home;

    let raf = 0;
    let last = performance.now();

    const frame = (t: number) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      const period = dayPeriod(localHour(serverNow(), timezone));
      const p = paletteFor(period);

      ctx.clearRect(0, 0, ROOM_SIZE, ROOM_SIZE);
      drawRoom(ctx, p, period === "night");
      for (const l of litter) {
        const sprite = LITTER[l.kind];
        if (sprite) drawSprite(ctx, sprite, l.x, l.y, p);
      }

      if (stage === "egg") {
        const wobble = t % 3200 < 600 ? (Math.floor(t / 150) % 2 ? 1 : -1) : 0;
        const x = 58 + wobble;
        const y = FLOOR_Y + 22 - EGG.rows.length;
        petBox.current = { x, y, w: 12, h: EGG.rows.length };
        ctx.fillStyle = p.shadow;
        ctx.fillRect(x + 1, y + EGG.rows.length - 1, 10, 2);
        drawSprite(ctx, EGG, x, y, p);
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
        const speed = type === "play" ? 28 : 10;
        if (walking) x += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
        petX.current = x;

        // 見た目
        let bob = 0;
        if (walking) bob = Math.floor(t / 250) % 2 ? -1 : 0;
        if (type === "play" && Math.floor(t / 400) % 3 === 0) bob = -3;
        if (type === "eat") bob = Math.floor(t / 300) % 2 ? -1 : 0;
        const eyesClosed = asleep || t % 4000 < 150;
        const sprite = eyesClosed ? blink(BABY) : BABY;
        const baseY = onBed ? FLOOR_Y + 5 : FLOOR_Y + 22;
        const px = Math.round(x);
        const py = baseY - sprite.rows.length + bob + (asleep ? 1 : 0);
        if (!onBed) {
          ctx.fillStyle = p.shadow;
          ctx.fillRect(px + 2, FLOOR_Y + 21, 12, 2);
        }
        drawSprite(ctx, sprite, px, py, p);
        petBox.current = { x: px, y: py, w: 16, h: sprite.rows.length };
        if (asleep) {
          const rise = Math.floor(t / 400) % 6;
          drawSprite(ctx, ZZZ, px + 14, py - 4 - rise, p);
        }
      }
      if (lightsOff) {
        // 電気を消した部屋。窓の外の明かりだけ残す
        ctx.fillStyle = "rgba(24, 22, 60, 0.55)";
        ctx.fillRect(0, 0, ROOM_SIZE, ROOM_SIZE);
      }

      const bubbleEl = bubbleRef.current;
      if (bubbleEl) {
        const b = petBox.current;
        bubbleEl.style.left = `${((b.x + b.w / 2) / ROOM_SIZE) * 100}%`;
        bubbleEl.style.top = `${(b.y / ROOM_SIZE) * 100}%`;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [stage, activity.type, activity.spot, litter, lightsOff, timezone]);

  const size = ROOM_SIZE * scale;
  return (
    <div ref={wrapRef} className="room">
      <div className="room-inner" style={{ width: size, height: size }}>
        <canvas
          ref={canvasRef}
          width={ROOM_SIZE}
          height={ROOM_SIZE}
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
