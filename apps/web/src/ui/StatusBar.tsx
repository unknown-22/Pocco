import { useEffect, useState } from "react";
import type { Pet } from "@pocco/sim";
import { serverNow } from "../store.ts";
import { formatClock } from "../time.ts";
import { STAGE_LABEL } from "./labels.ts";

const DAY = 24 * 60 * 60 * 1000;

export function StatusBar({ pet, timezone }: { pet: Pet; timezone: string }) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), 10_000);
    return () => clearInterval(id);
  }, []);
  const day = Math.floor((now - pet.bornAt) / DAY) + 1;

  return (
    <header className="status">
      <div className="status-name">
        <span className="pixel">{pet.name}</span>
        <span className="chip">{STAGE_LABEL[pet.state.stage]}</span>
      </div>
      <div className="status-meta">
        <span>{day}日目</span>
        <span className="pixel">{formatClock(now, timezone)}</span>
      </div>
    </header>
  );
}
