import { useEffect, useRef } from "react";
import { getSpecies } from "@pocco/sim";
import { paletteFor, withSpecies } from "../render/palette.ts";
import { FEATURES, bodySprite } from "../render/body.ts";
import { EGG, blink, drawSprite } from "../render/sprites.ts";

/** ペットの姿だけを大きく描く（旅立ち・思い出用） */
export function PetPortrait({
  speciesId,
  stage,
  eyesClosed = false,
  scale = 4,
}: {
  speciesId: string;
  stage: string;
  eyesClosed?: boolean;
  scale?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const W = 28;
  const H = 28;

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    const species = getSpecies(speciesId);
    const senior = stage === "senior" || stage === "final_day" || stage === "departed";
    const p = withSpecies(paletteFor("day"), "day", species.colors, senior);
    if (speciesId === "egg") {
      drawSprite(ctx, EGG, (W - 12) / 2, H - 15, p);
      return;
    }
    const bodyStage = stage === "departed" ? "adult" : stage;
    const body = eyesClosed ? blink(bodySprite(bodyStage)) : bodySprite(bodyStage);
    const w = body.rows[0]!.length;
    const x = Math.round((W - w) / 2);
    const y = H - body.rows.length - 1;
    drawSprite(ctx, body, x, y, p);
    if (species.feature !== "none") {
      const f = FEATURES[species.feature];
      drawSprite(ctx, f, x + Math.round((w - f.rows[0]!.length) / 2), y - f.rows.length + 1, p);
    }
  }, [speciesId, stage, eyesClosed]);

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      className="portrait"
      style={{ width: W * scale, height: H * scale }}
      aria-hidden
    />
  );
}
