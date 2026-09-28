import { useEffect, useState } from "react";
import type { Pet } from "@pocco/sim";
import { serverNow, useStore } from "../store.ts";
import { formatClock } from "../time.ts";
import { STAGE_LABEL } from "./labels.ts";
import { canFullscreen, toggleFullscreen, useFullscreen } from "../fullscreen.ts";

const DAY = 24 * 60 * 60 * 1000;

// 全画面ボタンのドット絵（16×16）。四隅のかぎ形が外向きなら「広げる」、内向きなら「戻す」
const ENTER_ICON = "M1 1h5v2H3v3H1zM10 1h5v5h-2V3h-3zM1 10h2v3h3v2H1zM13 10h2v5h-5v-2h3z";
const EXIT_ICON = "M4 1h2v5H1V4h3zM10 1h2v3h3v2h-5zM1 10h5v5H4v-3H1zM10 10h5v2h-3v3h-2z";

export function StatusBar({ pet, timezone }: { pet: Pet; timezone: string }) {
  const setSheet = useStore((s) => s.setSheet);
  const [now, setNow] = useState(serverNow);
  const fullscreen = useFullscreen();
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), 10_000);
    return () => clearInterval(id);
  }, []);
  const day = Math.floor((now - pet.bornAt) / DAY) + 1;
  const n = pet.state.needs;
  const signs = [
    n.hunger > 60 && "🍙",
    n.sleepiness > 60 && "💤",
    n.boredom > 60 && "🌀",
    n.loneliness > 60 && "💧",
  ].filter(Boolean);

  return (
    <header className="status">
      <button className="status-name" onClick={() => setSheet("status")} aria-label="ようすを見る">
        <span className="pixel">{pet.name}</span>
        <span className="chip">{STAGE_LABEL[pet.state.stage]}</span>
        {pet.state.stage !== "egg" && pet.state.stage !== "departed" && signs.length > 0 && <span className="signs" aria-hidden>{signs.join("")}</span>}
      </button>
      <div className="status-meta">
        <span>{day}日目</span>
        <span className="pixel">{formatClock(now, timezone)}</span>
        {canFullscreen() && (
          <button className="fullscreen-btn" onClick={toggleFullscreen} aria-label={fullscreen ? "全画面をやめる" : "全画面にする"} title={fullscreen ? "全画面をやめる" : "全画面にする"}>
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden shapeRendering="crispEdges">
              <path fill="currentColor" d={fullscreen ? EXIT_ICON : ENTER_ICON} />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}
