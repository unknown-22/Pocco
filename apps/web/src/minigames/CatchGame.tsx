import { useEffect, useRef, useState } from "react";
import type { Pet } from "@pocco/sim";
import { drawSprite } from "../render/sprite.ts";
import { drawPet } from "../render/pet.ts";
import { petPalette } from "../render/palette.ts";
import { CATCH, caught, catchSpawns, itemY, type FallingItem } from "./logic.ts";
import { PAPER, SNACK } from "../render/assets/index.ts";
import { useGameCanvas } from "./useGameCanvas.ts";

/** キャッチ: 落ちてくるおやつを、左右に動いて受けとめる */
export function CatchGame({ pet, speed, onFinish }: { pet: Pet; speed: number; onFinish: (score: number) => void }) {
  const { wrapRef, canvasRef, size, toRoom } = useGameCanvas();
  const target = useRef(64);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(CATCH.durationMs);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const p = petPalette(pet, "day");
    const items = catchSpawns(Date.now(), speed);
    const done = new Map<number, "caught" | "missed">();
    let x = 64;
    let points = 0;
    const start = performance.now();
    let last = start;
    let raf = 0;

    const frame = (now: number) => {
      const t = now - start;
      const dt = (now - last) / 1000;
      last = now;
      const dx = target.current - x;
      x += Math.sign(dx) * Math.min(Math.abs(dx), 150 * dt);

      ctx.fillStyle = p.hex("#bfe3f7");
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = p.hex("#dba97c");
      ctx.fillRect(0, 116, 128, 12);

      for (const it of items) {
        if (it.at > t || done.has(it.id)) continue;
        const y = itemY(it, t, speed);
        if (caught(it.x, y, x)) {
          done.set(it.id, "caught");
          if (it.kind === "snack") {
            points++;
            setScore(points);
          }
          continue;
        }
        if (y > 130) {
          done.set(it.id, "missed");
          continue;
        }
        drawItem(ctx, it, y, p);
      }
      const moving = Math.abs(dx) > 0.5;
      drawPet(ctx, { speciesId: pet.state.speciesId, stage: pet.state.stage, equipped: pet.state.equipped, pose: moving ? "walk" : "idle", t }, x, 117, p);

      setLeft(Math.max(0, CATCH.durationMs - t));
      if (t >= CATCH.durationMs) {
        onFinish(points);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const move = (e: React.PointerEvent) => {
    target.current = Math.max(CATCH.fieldMin, Math.min(CATCH.fieldMax, toRoom(e).x));
  };

  return (
    <div className="game">
      <GameHud score={`${score}こ`} leftMs={left} totalMs={CATCH.durationMs} />
      <div ref={wrapRef} className="room">
        <canvas
          ref={canvasRef}
          width={128}
          height={128}
          style={{ width: size, height: size, touchAction: "none" }}
          onPointerDown={move}
          onPointerMove={(e) => (e.buttons || e.pointerType === "mouse") && move(e)}
        />
      </div>
      <p className="muted game-help">左右をタップ・スライドして動かそう。紙くずは食べられない！</p>
    </div>
  );
}

function drawItem(ctx: CanvasRenderingContext2D, it: FallingItem, y: number, p: Parameters<typeof drawSprite>[4]) {
  const sprite = it.kind === "snack" ? SNACK : PAPER;
  drawSprite(ctx, sprite, Math.round(it.x - 2), Math.round(y), p);
}

export function GameHud({ score, leftMs, totalMs }: { score: string; leftMs: number; totalMs: number }) {
  return (
    <div className="game-hud pixel">
      <span>{score}</span>
      <span className="game-timer">
        <span style={{ width: `${(leftMs / totalMs) * 100}%` }} />
      </span>
    </div>
  );
}
