import { useEffect, useState } from "react";
import { localParts } from "@pocco/sim";
import type { PendingFarewell } from "../api.ts";
import { useStore } from "../store.ts";
import { PetPortrait } from "./PetPortrait.tsx";
import { daysLived } from "./labels.ts";

const LINE_MS = 2800;

type Step = "words" | "closing" | "light" | "summary";

/**
 * 旅立ちの演出（仕様書 7.3）。
 * 看取った場合: 目を覚まして最後のひとこと → 目を閉じて暗くなる → 光になって窓の外へ → 生きた日数。
 * 看取れなかった場合: 置き手紙 → 生きた日数。
 * 途中で閉じても、見終わるまで次に開いたときにまた流れる。
 */
export function Farewell({ farewell }: { farewell: PendingFarewell }) {
  const send = useStore((s) => s.send);
  const timezone = useStore((s) => s.game!.timezone);
  const [step, setStep] = useState<Step>("words");
  const [shown, setShown] = useState(0);
  const lines = farewell.lastWords;

  // ひとことを 1 行ずつゆっくり出す（スキップはできない）
  useEffect(() => {
    if (!farewell.witnessed || step !== "words") return;
    if (shown < lines.length) {
      const id = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 1500 : LINE_MS);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setStep("closing"), LINE_MS);
    return () => clearTimeout(id);
  }, [farewell.witnessed, step, shown, lines.length]);

  useEffect(() => {
    if (step === "closing") {
      const id = setTimeout(() => setStep("light"), 3500);
      return () => clearTimeout(id);
    }
    if (step === "light") {
      const id = setTimeout(() => setStep("summary"), 4000);
      return () => clearTimeout(id);
    }
  }, [step]);

  const finish = () => send({ type: "farewell_seen", petId: farewell.petId });
  const date = (t: number) => {
    const p = localParts(t, timezone);
    return `${p.year}年${p.month}月${p.day}日`;
  };

  if (step === "summary") {
    return (
      <div className="farewell is-black" onClick={finish} role="dialog" aria-label="旅立ち">
        <div className="farewell-summary pixel">
          <p className="farewell-big">{farewell.name} は {daysLived(farewell.bornAt, farewell.diedAt)} 日 生きました</p>
          <p className="farewell-dates">{date(farewell.bornAt)} 〜 {date(farewell.diedAt)}</p>
          <p className="farewell-tap">タップで とじる</p>
        </div>
      </div>
    );
  }

  if (!farewell.witnessed) {
    // 置き手紙
    return (
      <div className="farewell is-dim" role="dialog" aria-label="置き手紙">
        <div className="letter pixel">
          <p className="letter-head">ベッドの上に、置き手紙があった。</p>
          <div className="letter-body">
            {lines.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
            <p className="letter-sign">{farewell.name} より</p>
          </div>
          <button className="primary" onClick={() => setStep("summary")}>
            手紙を たたむ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`farewell ${step === "words" ? "is-dim" : "is-dark"}`} role="dialog" aria-label="旅立ち">
      <div className={`farewell-pet${step === "light" ? " is-gone" : ""}`}>
        <PetPortrait speciesId={farewell.speciesId} stage="departed" eyesClosed={step !== "words"} scale={5} />
      </div>
      {step === "light" && <div className="farewell-light" aria-hidden />}
      <div className="farewell-lines pixel">
        {lines.slice(0, shown).map((l, i) => (
          <p key={i} className="farewell-line">{l}</p>
        ))}
      </div>
    </div>
  );
}
