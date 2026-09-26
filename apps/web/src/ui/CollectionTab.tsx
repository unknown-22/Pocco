import { useState } from "react";
import { Encyclopedia } from "./Encyclopedia.tsx";
import { Album } from "./Album.tsx";
import { Memorial } from "./Memorial.tsx";

type View = "zukan" | "album" | "memorial";

export function CollectionTab() {
  const [view, setView] = useState<View>("zukan");
  return (
    <>
      <div className="segmented page-tabs" role="tablist">
        {([
          ["zukan", "図鑑"],
          ["album", "アルバム"],
          ["memorial", "思い出"],
        ] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={view === id} className={view === id ? "is-active" : ""} onClick={() => setView(id)}>
            {label}
          </button>
        ))}
      </div>
      {view === "zukan" && <Encyclopedia />}
      {view === "album" && <Album />}
      {view === "memorial" && <Memorial />}
    </>
  );
}
