import { useEffect } from "react";
import { useStore } from "../store.ts";
import { formatDuration } from "../time.ts";
import { ActionBar } from "./ActionBar.tsx";
import { RoomCanvas } from "./RoomCanvas.tsx";
import { ACTIVITY_LABEL } from "./labels.ts";

/** 放っておくと独り言を言う間隔（仕様書 10.5） */
const MONOLOGUE_MS = 45_000;

export function Home() {
  const game = useStore((s) => s.game)!;
  const bubble = useStore((s) => s.bubble);
  const send = useStore((s) => s.send);
  const setTab = useStore((s) => s.setTab);
  const { pet, room, timezone, unread, absence } = game;

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") send({ type: "talk", idle: true });
    }, MONOLOGUE_MS);
    return () => clearInterval(id);
  }, [send]);

  return (
    <>
      <RoomCanvas
        stage={pet.state.stage}
        activity={pet.state.activity}
        litter={room.litter}
        lightsOff={Boolean(room.lightsOff)}
        timezone={timezone}
        bubble={bubble}
        onTapPet={() => send({ type: "talk" })}
        onTapLitter={(id) => send({ type: "clean", litterIds: [id] })}
      />
      <p className="now-doing pixel">いま: {ACTIVITY_LABEL[pet.state.activity.type] ?? "…"}</p>
      <ActionBar />
      {unread > 0 && (
        <button className="card notice" onClick={() => setTab("diary")}>
          <span className="pixel">📖 {absence ? `${formatDuration(absence.to - absence.from)}ぶりだね。` : ""}日記が {unread} 件ふえています</span>
          <span className="muted">タップして読む ›</span>
        </button>
      )}
      <p className="hint muted">ペットをタップすると話しかけます。ゴミはタップで片付けられます。</p>
    </>
  );
}
