import { useEffect, useRef, useState } from "react";
import type { Stage } from "@pocco/sim";
import { paletteFor } from "../render/palette.ts";
import { drawRoom, FLOOR_Y, ROOM_SIZE } from "../render/room.ts";
import { BABY, EGG, blink, drawSprite } from "../render/sprites.ts";
import { dayPeriod, localHM } from "../time.ts";
import { serverNow } from "../store.ts";

interface Props {
  stage: Stage;
  timezone: string;
}

/**
 * 部屋とペットを描く。うろうろ・まばたきはクライアント側の演出で、状態は変えない（仕様書 4.3）。
 */
export function RoomCanvas({ stage, timezone }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(3);

  // 画面幅に収まる最大の整数倍で拡大する
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry!.contentRect.width;
      setScale(Math.max(1, Math.floor(w / ROOM_SIZE)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const pet = { x: 58, target: 58, nextDecision: 0 };
    let raf = 0;
    let last = performance.now();

    const frame = (t: number) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      const period = dayPeriod(localHM(serverNow(), timezone).h);
      const p = paletteFor(period);

      ctx.clearRect(0, 0, ROOM_SIZE, ROOM_SIZE);
      drawRoom(ctx, p, period === "night");

      if (stage === "egg") {
        // ときどきゆらゆら揺れる
        const wobble = t % 3200 < 600 ? (Math.floor(t / 150) % 2 ? 1 : -1) : 0;
        const x = 58 + wobble;
        const y = FLOOR_Y + 22 - EGG.rows.length;
        ctx.fillStyle = p.shadow;
        ctx.fillRect(x + 1, y + EGG.rows.length - 1, 10, 2);
        drawSprite(ctx, EGG, x, y, p);
      } else {
        if (t > pet.nextDecision) {
          pet.target = 30 + Math.random() * 56;
          pet.nextDecision = t + 2500 + Math.random() * 4000;
        }
        const dx = pet.target - pet.x;
        const walking = Math.abs(dx) > 0.5;
        if (walking) pet.x += Math.sign(dx) * Math.min(Math.abs(dx), 10 * dt);
        const bob = walking && Math.floor(t / 250) % 2 ? -1 : 0;
        const blinking = t % 4000 < 150;
        const sprite = blinking ? blink(BABY) : BABY;
        const x = Math.round(pet.x);
        const y = FLOOR_Y + 22 - sprite.rows.length + bob;
        ctx.fillStyle = p.shadow;
        ctx.fillRect(x + 2, FLOOR_Y + 21, 12, 2);
        drawSprite(ctx, sprite, x, y, p);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [stage, timezone]);

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
