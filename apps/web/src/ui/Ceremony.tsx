import { useEffect, useRef, useState } from "react";
import { getSpecies, type Ceremony as CeremonyData } from "@pocco/sim";
import { useStore } from "../store.ts";
import { STAGE_SIZE } from "../render/scenes/common.ts";
import { HATCH_MS, drawHatch } from "../render/scenes/hatch.ts";
import { EVOLVE_MS, drawEvolve } from "../render/scenes/evolve.ts";
import { SENIOR_MS, drawSenior } from "../render/scenes/senior.ts";

const SCALE = 4;

const STAGE_LABEL: Record<string, string> = { child: "こども", teen: "ティーン", adult: "おとな" };

const DURATION: Record<CeremonyData["kind"], number> = { hatch: HATCH_MS, evolve: EVOLVE_MS, senior: SENIOR_MS };

/**
 * 孵化・進化・シニアの全画面の演出（仕様書 11.2）。
 * 見ていない節目は、開いたときに古いものから 1 つずつ流れる。タップで早送り、見終わったらタップで閉じる。
 */
export function Ceremony({ ceremony, name }: { ceremony: CeremonyData; name: string }) {
  const send = useStore((s) => s.send);
  const ref = useRef<HTMLCanvasElement>(null);
  const start = useRef(performance.now());
  const [done, setDone] = useState(false);
  const duration = DURATION[ceremony.kind];

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    let raf = 0;
    const frame = (now: number) => {
      const t = Math.max(0, now - start.current);
      ctx.clearRect(0, 0, STAGE_SIZE, STAGE_SIZE);
      if (ceremony.kind === "hatch") drawHatch(ctx, t, ceremony.toSpecies);
      else if (ceremony.kind === "evolve")
        drawEvolve(ctx, t, { fromSpecies: ceremony.fromSpecies, fromStage: ceremony.fromStage, toSpecies: ceremony.toSpecies, toStage: ceremony.stage });
      else drawSenior(ctx, t, ceremony.toSpecies, ceremony.fromStage);
      if (t >= duration) setDone(true);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [ceremony, duration]);

  const onTap = () => {
    if (!done) {
      // 早送り: 最後の場面まで飛ばす
      start.current = performance.now() - duration;
      return;
    }
    send({ type: "ceremony_seen", at: ceremony.at });
  };

  const species = getSpecies(ceremony.toSpecies);
  const text =
    ceremony.kind === "hatch"
      ? { head: "たまごが かえった！", body: `${name}が うまれた。`, sub: "なまえは 設定で かえられます" }
      : ceremony.kind === "evolve"
        ? { head: `${STAGE_LABEL[ceremony.stage] ?? ""}に なった！`, body: `「${species.name}」に そだった。`, sub: species.description }
        : { head: "シニアに なった", body: "少し 白いものが まじってきた。", sub: "これからは ゆっくり すごそう" };

  return (
    <div className={`ceremony is-${ceremony.kind}`} onClick={onTap} role="dialog" aria-label={text.head}>
      <canvas
        ref={ref}
        width={STAGE_SIZE}
        height={STAGE_SIZE}
        className="ceremony-stage"
        style={{ width: STAGE_SIZE * SCALE, height: STAGE_SIZE * SCALE }}
        aria-hidden
      />
      <div className={`ceremony-text pixel${done ? " is-shown" : ""}`}>
        <p className="ceremony-head">{text.head}</p>
        <p>{text.body}</p>
        <p className="ceremony-sub">{text.sub}</p>
        <p className="ceremony-tap">タップで とじる</p>
      </div>
    </div>
  );
}
