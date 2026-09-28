// 全画面表示（アドレスバーなどを隠す）。PWA を見送ったので（D14）、ブラウザの Fullscreen API で代わりにする。
// 安全な接続でなくても使える。iPhone の Safari は要素の全画面に対応していないので、そのときはボタンを出さない。
// 古い Safari（iPad）向けに webkit 付きの名前も見る。

import { useEffect, useState } from "react";

type WebkitDocument = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

const doc = () => document as WebkitDocument;

export function canFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(doc().fullscreenEnabled ?? doc().webkitFullscreenEnabled);
}

export function isFullscreen(): boolean {
  return Boolean(doc().fullscreenElement ?? doc().webkitFullscreenElement);
}

export async function toggleFullscreen(): Promise<void> {
  try {
    if (isFullscreen()) {
      if (document.exitFullscreen) await document.exitFullscreen();
      else await doc().webkitExitFullscreen?.();
    } else {
      const el = document.documentElement as WebkitElement;
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" });
      else await el.webkitRequestFullscreen?.();
    }
  } catch {
    // 断られた（ユーザー操作の外・端末の設定など）ときは、そのままの表示で続ける
  }
}

/** 全画面かどうか。戻るボタンや Esc で抜けたときも追従する */
export function useFullscreen(): boolean {
  const [on, setOn] = useState(isFullscreen);
  useEffect(() => {
    const onChange = () => setOn(isFullscreen());
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);
  return on;
}
