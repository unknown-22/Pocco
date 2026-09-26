import { useEffect, useRef, useState } from "react";
import { ROOM_SIZE } from "../render/room.ts";

/** 128×128 のキャンバスを、画面幅に収まる整数倍で表示する */
export function useGameCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(3);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(Math.max(1, Math.floor(entry!.contentRect.width / ROOM_SIZE))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  /** 画面上の座標を部屋の座標に */
  const toRoom = (e: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * ROOM_SIZE,
      y: ((e.clientY - rect.top) / rect.height) * ROOM_SIZE,
    };
  };
  return { wrapRef, canvasRef, size: ROOM_SIZE * scale, toRoom };
}
