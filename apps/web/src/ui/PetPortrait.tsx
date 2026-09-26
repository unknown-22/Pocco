import { useEffect, useRef } from "react";
import { getSpecies, type Equipped } from "@pocco/sim";
import { paletteFor, withSpecies } from "../render/palette.ts";
import { drawSprite } from "../render/sprite.ts";
import { EGG } from "../render/assets/index.ts";
import { drawPet } from "../render/pet.ts";

/** ペットの姿だけを大きく描く（旅立ち・思い出・図鑑用）。silhouette は図鑑の未登録 */
export function PetPortrait({
  speciesId,
  stage,
  equipped = {},
  eyesClosed = false,
  silhouette = false,
  scale = 4,
}: {
  speciesId: string;
  stage: string;
  equipped?: Equipped;
  eyesClosed?: boolean;
  silhouette?: boolean;
  scale?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const W = 30;
  const H = 30;
  const equippedKey = JSON.stringify(equipped);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    const species = getSpecies(speciesId);
    const senior = stage === "senior" || stage === "final_day" || stage === "departed";
    const p = withSpecies(paletteFor("day"), "day", species.colors, senior);
    if (speciesId === "egg") drawSprite(ctx, EGG, (W - 12) / 2, H - 15, p);
    else drawPet(ctx, { speciesId, stage, equipped, eyesClosed }, W / 2, H - 1, p);
    if (silhouette) {
      ctx.globalCompositeOperation = "source-in";
      ctx.fillStyle = "#cbbfd4";
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speciesId, stage, eyesClosed, silhouette, equippedKey]);

  return (
    <canvas ref={ref} width={W} height={H} className="portrait" style={{ width: W * scale, height: H * scale }} aria-hidden />
  );
}
