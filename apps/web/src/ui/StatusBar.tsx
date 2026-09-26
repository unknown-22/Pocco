import { useEffect, useState } from "react";
import type { Pet } from "@pocco/sim";
import { serverNow, useStore } from "../store.ts";
import { formatClock } from "../time.ts";
import { STAGE_LABEL } from "./labels.ts";

const DAY = 24 * 60 * 60 * 1000;

export function StatusBar({ pet, timezone }: { pet: Pet; timezone: string }) {
  const setSheet = useStore((s) => s.setSheet);
  const [now, setNow] = useState(serverNow);
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
        {pet.state.stage !== "egg" && signs.length > 0 && <span className="signs" aria-hidden>{signs.join("")}</span>}
      </button>
      <div className="status-meta">
        <span>{day}日目</span>
        <span className="pixel">{formatClock(now, timezone)}</span>
      </div>
    </header>
  );
}
