import { useEffect, useRef, useState } from "react";
import { localParts, type RoomState } from "@pocco/sim";
import type { PendingFarewell } from "../api.ts";
import { useStore } from "../store.ts";
import { CLOSING_MS, LIGHT_MS, drawFarewell, type FarewellPhase } from "../render/scenes/farewell.ts";
import { ROOM_SIZE } from "../render/room.ts";
import { composeFarewellScene, uploadPhoto } from "../photo.ts";
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
  const room = useStore((s) => s.game!.room);

  // 看取った最後の場面は、自動で写真に残す（1 匹につき 1 枚。サーバー側で重複を防ぐ）
  useEffect(() => {
    if (!farewell.witnessed) return;
    composeFarewellScene(room, farewell.speciesId)
      .then((blob) => uploadPhoto(blob, { kind: "farewell", petId: farewell.petId, caption: `${farewell.name}の 最後の日` }))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farewell.petId]);

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
      const id = setTimeout(() => setStep("light"), CLOSING_MS);
      return () => clearTimeout(id);
    }
    if (step === "light") {
      const id = setTimeout(() => setStep("summary"), LIGHT_MS + 600);
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
      <FarewellScene room={room} speciesId={farewell.speciesId} phase={step as FarewellPhase} />
      <div className="farewell-lines pixel">
        {lines.slice(0, shown).map((l, i) => (
          <p key={i} className="farewell-line">{l}</p>
        ))}
      </div>
    </div>
  );
}

/** 夕方の部屋で目を閉じ、暗くなって、光の玉が窓の外へ消えていく（ドット絵の場面） */
function FarewellScene({ room, speciesId, phase }: { room: RoomState; speciesId: string; phase: FarewellPhase }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(2);

  // 画面に収まる整数倍（最大 3 倍）
  useEffect(() => {
    const fit = () => setScale(Math.max(1, Math.min(3, Math.floor((window.innerWidth - 32) / ROOM_SIZE))));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const start = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      drawFarewell(ctx, room, speciesId, phase, Math.max(0, now - start));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [room, speciesId, phase]);

  return (
    <canvas
      ref={ref}
      width={ROOM_SIZE}
      height={ROOM_SIZE}
      className="farewell-scene"
      style={{ width: ROOM_SIZE * scale, height: ROOM_SIZE * scale }}
      aria-hidden
    />
  );
}
