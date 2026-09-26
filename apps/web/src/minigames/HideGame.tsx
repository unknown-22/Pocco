import { useEffect, useRef, useState } from "react";
import type { Pet, RoomState } from "@pocco/sim";
import { drawRoom } from "../render/room.ts";
import { drawPet } from "../render/pet.ts";
import { drawSprite } from "../render/sprite.ts";
import { ZZZ } from "../render/assets/index.ts";
import { petPalette } from "../render/palette.ts";
import { HIDE, HIDE_SPOTS, hideRounds } from "./logic.ts";
import { GameHud } from "./CatchGame.tsx";
import { useGameCanvas } from "./useGameCanvas.ts";

type Phase = "hiding" | "guess" | "reveal";

const HIDE_MS = 1200;
const REVEAL_MS = 900;

/** かくれんぼ: ペットが隠れた場所を当てる。3 回勝負 */
export function HideGame({
  pet,
  room,
  aptitude,
  onFinish,
}: {
  pet: Pet;
  room: RoomState;
  aptitude: { sleepy: number; peek: number };
  onFinish: (score: number) => void;
}) {
  const { wrapRef, canvasRef, size } = useGameCanvas();
  const [rounds] = useState(() => hideRounds(Date.now(), aptitude));
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("hiding");
  const [guess, setGuess] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const phaseStart = useRef(performance.now());
  const [left, setLeft] = useState(HIDE.answerMs);
  const current = rounds[round]!;

  // 段取りを進める
  useEffect(() => {
    phaseStart.current = performance.now();
    if (phase === "hiding") {
      const id = setTimeout(() => setPhase("guess"), HIDE_MS);
      return () => clearTimeout(id);
    }
    if (phase === "guess") {
      const id = setTimeout(() => setPhase("reveal"), HIDE.answerMs);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => {
      if (round + 1 >= HIDE.rounds) {
        onFinish(score);
      } else {
        setRound(round + 1);
        setGuess(null);
        setPhase("hiding");
      }
    }, REVEAL_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const p = petPalette(pet, "day");
    const spot = HIDE_SPOTS[current.spot]!;
    let raf = 0;
    const frame = (now: number) => {
      const t = now - phaseStart.current;
      drawRoom(ctx, p, false, room);
      const look = { speciesId: pet.state.speciesId, stage: pet.state.stage, equipped: pet.state.equipped };
      if (phase === "hiding") {
        // 真ん中から隠れ場所へ走っていく
        const k = Math.min(1, t / (HIDE_MS * 0.8));
        drawPet(ctx, look, 64 + (spot.x - 64) * k, 104, p);
      } else if (phase === "guess") {
        setLeft(Math.max(0, HIDE.answerMs - t));
        if (current.asleep) drawSprite(ctx, ZZZ, spot.x + 6, spot.y - 22 - (Math.floor(t / 400) % 4), p);
        if (current.peek && Math.floor(t / 700) % 3 === 0) {
          ctx.fillStyle = p.eye;
          ctx.fillRect(spot.x - 3, spot.y - 14, 1, 2);
          ctx.fillRect(spot.x + 2, spot.y - 14, 1, 2);
        }
      } else {
        drawPet(ctx, { ...look, eyesClosed: current.asleep }, spot.x, spot.y + 6, p);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round]);

  const choose = (i: number) => {
    if (phase !== "guess") return;
    setGuess(i);
    if (i === current.spot) setScore((s) => s + 1);
    setPhase("reveal");
  };

  return (
    <div className="game">
      <GameHud score={`${round + 1}/${HIDE.rounds}回目・${score}回 せいかい`} leftMs={phase === "guess" ? left : HIDE.answerMs} totalMs={HIDE.answerMs} />
      <div ref={wrapRef} className="room">
        <div className="room-inner" style={{ width: size, height: size }}>
          <canvas ref={canvasRef} width={128} height={128} style={{ width: size, height: size }} />
          {HIDE_SPOTS.map((s, i) => (
            <button
              key={s.id}
              className={`hide-spot${phase === "guess" ? " is-active" : ""}${phase === "reveal" && guess === i ? (i === current.spot ? " is-right" : " is-wrong") : ""}`}
              style={{ left: `${(s.x / 128) * 100}%`, top: `${((s.y - 8) / 128) * 100}%` }}
              onClick={() => choose(i)}
              disabled={phase !== "guess"}
              aria-label={s.label}
            >
              {phase === "reveal" && guess === i ? (i === current.spot ? "○" : "×") : "?"}
            </button>
          ))}
        </div>
      </div>
      <p className="muted game-help pixel">
        {phase === "hiding" ? "もういいかい…？" : phase === "guess" ? "もういいよ！ どこかな？" : guess === current.spot ? "みつけた！" : "ちがった…"}
      </p>
    </div>
  );
}
