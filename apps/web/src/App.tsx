import { useEffect } from "react";
import { useStore } from "./store.ts";
import { StatusBar } from "./ui/StatusBar.tsx";
import { Home } from "./ui/Home.tsx";
import { Diary } from "./ui/Diary.tsx";
import { TabBar } from "./ui/TabBar.tsx";
import { Settings } from "./ui/Settings.tsx";
import { Items } from "./ui/Items.tsx";
import { FoodSheet } from "./ui/FoodSheet.tsx";
import { StatusSheet } from "./ui/StatusSheet.tsx";
import { Memorial } from "./ui/Memorial.tsx";
import { Farewell } from "./ui/Farewell.tsx";

const POLL_MS = 30_000;

export function App() {
  const game = useStore((s) => s.game);
  const error = useStore((s) => s.error);
  const tab = useStore((s) => s.tab);
  const refresh = useStore((s) => s.refresh);
  const sheet = useStore((s) => s.sheet);

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
              {tab === "home" && <Home />}
              {tab === "diary" && <Diary />}
              {tab === "items" && <Items />}
              {tab === "collection" && <Memorial />}
              {tab === "settings" && <Settings />}
            </main>
            {error && <div className="toast">通信エラー: {error}</div>}
            <TabBar />
            {sheet === "food" && <FoodSheet />}
            {sheet === "status" && <StatusSheet />}
            {game.pendingFarewell && <Farewell key={game.pendingFarewell.petId} farewell={game.pendingFarewell} />}
          </>
        )}
      </div>
    </div>
  );
}
