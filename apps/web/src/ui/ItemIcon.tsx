import { useEffect, useRef } from "react";
import { iconSprite, type IconKind } from "../render/icons.ts";
import { drawSprite, type DrawPalette } from "../render/sprite.ts";
import { paletteFor } from "../render/palette.ts";

/** 昼の色そのまま（時間帯の色味は付けない） */
const PALETTE: DrawPalette = { ...paletteFor("day"), hex: undefined };

/**
 * 持ち物のドット絵アイコン。size（px）に収まる最大の整数倍で拡大する。
 * 絵がないときは代わりの文字（絵文字）を出す。
 */
export function ItemIcon({
  kind,
  id,
  size = 36,
  fallback,
  inline = false,
}: {
  kind: IconKind;
  id: string;
  size?: number;
  fallback?: string;
  /** 文の中に置く（小さく、行にそろえる） */
  inline?: boolean;
}) {
  const cls = inline ? "item-icon is-inline" : "item-icon";
  const ref = useRef<HTMLCanvasElement>(null);
  const sprite = iconSprite(kind, id);
  const w = sprite?.rows[0]!.length ?? 1;
  const h = sprite?.rows.length ?? 1;
  const scale = Math.max(1, Math.floor(size / Math.max(w, h)));

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx || !sprite) return;
    ctx.clearRect(0, 0, w, h);
    drawSprite(ctx, sprite, 0, 0, PALETTE);
  }, [sprite, w, h]);

  if (!sprite) return <span className={cls} aria-hidden>{fallback}</span>;
  return (
    <span className={cls} style={{ width: size, height: size }} aria-hidden>
      <canvas ref={ref} width={w} height={h} style={{ width: w * scale, height: h * scale }} />
    </span>
  );
}
