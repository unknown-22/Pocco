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
  timezone: string;
}

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
export function RoomCanvas({ stage, activity, litter, timezone }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(3);
  const petX = useRef<number | null>(null);

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
        if (asleep) {
          const rise = Math.floor(t / 400) % 6;
          drawSprite(ctx, ZZZ, px + 14, py - 4 - rise, p);
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [stage, activity.type, activity.spot, litter, timezone]);

  const size = ROOM_SIZE * scale;
  return (
    <div ref={wrapRef} className="room">
      <canvas
        ref={canvasRef}
        width={ROOM_SIZE}
        height={ROOM_SIZE}
        style={{ width: size, height: size }}
        aria-label="ペットの部屋"
      />
    </div>
  );
}
