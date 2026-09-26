import { useEffect, useRef, useState } from "react";
import type { Pet } from "@pocco/sim";
import { drawPet } from "../render/pet.ts";
import { drawSprite } from "../render/sprites.ts";
import { petPalette } from "../render/palette.ts";
import { RHYTHM, judgeTap, rhythmBeats, rhythmScore, type Grade } from "./logic.ts";
import { NOTE_SPRITE } from "./sprites.ts";
import { GameHud } from "./CatchGame.tsx";
import { useGameCanvas } from "./useGameCanvas.ts";

const HIT_X = 40;
const START_X = 122;

const GRADE_LABEL: Record<Grade, string> = { good: "ぴったり！", ok: "いいかんじ", miss: "ずれた…" };

/** リズムタップ: ペットの鼻歌（♪）が線に重なったらタップ */
export function RhythmGame({ pet, speed, steady, onFinish }: { pet: Pet; speed: number; steady: boolean; onFinish: (score: number) => void }) {
  const { wrapRef, canvasRef, size } = useGameCanvas();
  const [beats] = useState(() => rhythmBeats(Date.now(), steady, speed));
  const judged = useRef<(Grade | null)[]>(beats.map(() => null));
  const start = useRef(performance.now());
  const [last, setLast] = useState<Grade | null>(null);
  const [score, setScore] = useState(0);
  const end = beats.at(-1)! + 700;
  const [left, setLeft] = useState(end);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const p = petPalette(pet, "evening");
    let raf = 0;
    const frame = (now: number) => {
      const t = now - start.current;
      ctx.fillStyle = p.hex("#f6e7d0");
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = p.hex("#e0cdb0");
      ctx.fillRect(0, 66, 128, 1);
      ctx.fillStyle = p.hex("#9d7fd6");
      ctx.fillRect(HIT_X, 50, 1, 32);
      ctx.fillStyle = p.hex("#dba97c");
      ctx.fillRect(0, 108, 128, 20);

      // ♪ が右から流れてくる
      beats.forEach((b, i) => {
        if (judged.current[i]) return;
        const x = HIT_X + ((b - t) / RHYTHM.leadMs) * (START_X - HIT_X);
        if (x < HIT_X - 20 || x > START_X + 4) return;
        drawSprite(ctx, NOTE_SPRITE, Math.round(x) - 2, 62, p);
      });
      // 拍に合わせて体をゆらす
      const onBeat = beats.some((b) => Math.abs(t - b) < 90);
      drawPet(ctx, { speciesId: pet.state.speciesId, stage: pet.state.stage, equipped: pet.state.equipped, eyesClosed: onBeat }, 22, 108 - (onBeat ? 2 : 0), p);

      // 叩かれずに通りすぎた拍は miss
      beats.forEach((b, i) => {
        if (!judged.current[i] && t - b > RHYTHM.okMs) judged.current[i] = "miss";
      });
      setLeft(Math.max(0, end - t));
      if (t >= end) {
        onFinish(rhythmScore(judged.current));
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = () => {
    const r = judgeTap(beats, judged.current, performance.now() - start.current);
    if (!r) return;
    judged.current[r.index] = r.grade;
    setLast(r.grade);
    setScore(rhythmScore(judged.current));
  };

  return (
    <div className="game">
      <GameHud score={`${score}/${RHYTHM.beats}`} leftMs={left} totalMs={end} />
      <div ref={wrapRef} className="room">
        <canvas ref={canvasRef} width={128} height={128} style={{ width: size, height: size, touchAction: "manipulation" }} onPointerDown={tap} />
      </div>
      <p className="game-help pixel">{last ? GRADE_LABEL[last] : "♪ が線に重なったらタップ！"}</p>
      <button className="primary tap-button" onPointerDown={tap}>タップ</button>
    </div>
  );
}
