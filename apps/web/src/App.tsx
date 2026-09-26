import { useEffect } from "react";
import { useStore } from "./store.ts";
import { RoomCanvas } from "./ui/RoomCanvas.tsx";
import { StatusBar } from "./ui/StatusBar.tsx";
import { ActionBar } from "./ui/ActionBar.tsx";
import { TabBar } from "./ui/TabBar.tsx";
import { Placeholder } from "./ui/Placeholder.tsx";
import { Settings } from "./ui/Settings.tsx";

const POLL_MS = 30_000;

export function App() {
  const game = useStore((s) => s.game);
  const error = useStore((s) => s.error);
  const tab = useStore((s) => s.tab);
  const refresh = useStore((s) => s.refresh);

  // 定期的に、また画面に戻ってきたときに最新の状態を取る（仕様書 4.3）
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const pet = game?.pet;

  return (
    <div className="stage">
      <div className="phone">
        {!game || !pet ? (
          <div className="loading pixel">{error ? `つながらない… (${error})` : "よみこみちゅう…"}</div>
        ) : (
          <>
            <StatusBar pet={pet} timezone={game.timezone} />
            <main className="content">
              {tab === "home" && (
                <>
                  <RoomCanvas stage={pet.state.stage} timezone={game.timezone} />
                  <ActionBar />
                </>
              )}
              {tab === "diary" && <Placeholder title="日記" note="留守中の日記は P1 で実装します" />}
              {tab === "items" && <Placeholder title="もちもの" note="食べ物・拾い物・着せ替えは P2〜P4 で実装します" />}
              {tab === "collection" && <Placeholder title="図鑑" note="図鑑・思い出・アルバムは P3〜P4 で実装します" />}
              {tab === "settings" && <Settings />}
            </main>
            {error && <div className="toast">通信エラー: {error}</div>}
            <TabBar />
          </>
        )}
      </div>
    </div>
  );
}
