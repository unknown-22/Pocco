import { useState } from "react";
import { GAMES, gameAptitude, type GameId } from "@pocco/sim";
import { useStore } from "../store.ts";
import { CatchGame } from "./CatchGame.tsx";
import { HideGame } from "./HideGame.tsx";
import { RhythmGame } from "./RhythmGame.tsx";
import { CATCH, HIDE, RHYTHM } from "./logic.ts";

const SUCCESS_AT: Record<GameId, number> = { catch: CATCH.successAt, hide: HIDE.successAt, rhythm: RHYTHM.successAt };

type Phase = { name: "pick" } | { name: "play"; game: GameId } | { name: "done"; game: GameId; score: number };

/** 遊ぶ（仕様書 10.2）。ゲームを選ぶ → 遊ぶ（数秒）→ 結果をサーバーに送る */
export function MiniGame({ onClose }: { onClose: () => void }) {
  const game = useStore((s) => s.game)!;
  const send = useStore((s) => s.send);
  const [phase, setPhase] = useState<Phase>({ name: "pick" });
  const aptitude = gameAptitude(game.pet.state.personality);

  const finish = (id: GameId) => (score: number) => {
    setPhase({ name: "done", game: id, score });
    send({ type: "play", game: id, score, success: score >= SUCCESS_AT[id] });
  };

  return (
    <div className="minigame" role="dialog" aria-label="あそぶ">
      <div className="minigame-head">
        <h2 className="pixel">あそぶ</h2>
        <button className="sheet-close" onClick={onClose} aria-label="とじる">✕</button>
      </div>

      {phase.name === "pick" && (
        <div className="game-list">
          {GAMES.map((g) => (
            <button key={g.id} className="card game-card" onClick={() => setPhase({ name: "play", game: g.id })}>
              <span className="game-icon" aria-hidden>{g.icon}</span>
              <span>
                <span className="pixel">{g.name}</span>
                <span className="muted game-desc">{g.description}</span>
              </span>
            </button>
          ))}
          {aptitude.sleepy > 0 && <p className="muted">のんびり屋なので、かくれんぼ中に寝てしまうかも…</p>}
        </div>
      )}

      {phase.name === "play" && phase.game === "catch" && <CatchGame pet={game.pet} speed={aptitude.speed} onFinish={finish("catch")} />}
      {phase.name === "play" && phase.game === "hide" && <HideGame pet={game.pet} room={game.room} aptitude={aptitude} onFinish={finish("hide")} />}
      {phase.name === "play" && phase.game === "rhythm" && (
        <RhythmGame pet={game.pet} speed={aptitude.speed} steady={aptitude.steadyRhythm} onFinish={finish("rhythm")} />
      )}

      {phase.name === "done" && (
        <div className="game-result">
          <p className="pixel game-result-title">{phase.score >= SUCCESS_AT[phase.game] ? "やったね！" : "ざんねん…"}</p>
          <p className="muted">
            {GAMES.find((g) => g.id === phase.game)!.name}: {phase.score}
            {phase.game === "catch" ? "こ" : "回"}（{SUCCESS_AT[phase.game]} 以上で成功）
          </p>
          <div className="game-result-actions">
            <button className="secondary" onClick={() => setPhase({ name: "play", game: phase.game })}>もういちど</button>
            <button className="primary" onClick={onClose}>おわる</button>
          </div>
        </div>
      )}
    </div>
  );
}
