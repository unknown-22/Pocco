import { useStore } from "../store.ts";
import { formatDuration } from "../time.ts";
import { ActionBar } from "./ActionBar.tsx";
import { RoomCanvas } from "./RoomCanvas.tsx";
import { ACTIVITY_LABEL } from "./labels.ts";

export function Home() {
  const game = useStore((s) => s.game)!;
  const setTab = useStore((s) => s.setTab);
  const { pet, room, timezone, unread, absence } = game;

  return (
    <>
      <RoomCanvas stage={pet.state.stage} activity={pet.state.activity} litter={room.litter} timezone={timezone} />
      <p className="now-doing pixel">いま: {ACTIVITY_LABEL[pet.state.activity.type] ?? "…"}</p>
      <ActionBar />
      {unread > 0 && (
        <button className="card notice" onClick={() => setTab("diary")}>
          <span className="pixel">📖 {absence ? `${formatDuration(absence.to - absence.from)}ぶりだね。` : ""}日記が {unread} 件ふえています</span>
          <span className="muted">タップして読む ›</span>
        </button>
      )}
    </>
  );
}
