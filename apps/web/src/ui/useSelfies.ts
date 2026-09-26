import { useEffect } from "react";
import { useStore } from "../store.ts";
import { composeSelfie, uploadPhoto } from "../photo.ts";

/** 送っている途中の自撮り（ポーリングで二重に撮らないように） */
const inFlight = new Set<string>();

/**
 * 留守中の自撮りを、開いたときに写真にしてアルバムへ入れる（仕様書 10.10）。
 * サーバー側でも 1 枚に限っているので、失敗しても次の取得でやり直せばよい。
 */
export function useSelfies() {
  const game = useStore((s) => s.game);
  const refresh = useStore((s) => s.refresh);
  const showToast = useStore((s) => s.showToast);

  useEffect(() => {
    if (!game || game.pendingSelfies.length === 0) return;
    const todo = game.pendingSelfies.filter((sf) => !inFlight.has(`${sf.petId}:${sf.at}`));
    if (todo.length === 0) return;
    for (const sf of todo) inFlight.add(`${sf.petId}:${sf.at}`);
    (async () => {
      let saved = 0;
      for (const sf of todo) {
        try {
          const blob = await composeSelfie(game.room, sf, game.timezone);
          const res = await uploadPhoto(blob, { kind: "selfie", petId: sf.petId, selfieAt: sf.at });
          if (!res.skipped) saved++;
        } catch {
          // 次に状態を取ったときにやり直す
        } finally {
          inFlight.delete(`${sf.petId}:${sf.at}`);
        }
      }
      if (saved > 0) {
        showToast(saved > 1 ? `自撮りが ${saved} 枚 アルバムに入った` : "自撮りが アルバムに入った");
        refresh();
      }
    })();
  }, [game, refresh, showToast]);
}
