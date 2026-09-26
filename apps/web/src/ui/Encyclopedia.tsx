import { useEffect, useState } from "react";
import {
  CATEGORY_LABEL,
  EVENT_ENTRIES,
  FOODS,
  HOBBIES,
  SPECIES,
  TREASURES,
  type CollectionCategory,
} from "@pocco/sim";
import { api, type CollectionState } from "../api.ts";
import { useStore } from "../store.ts";
import { PetPortrait } from "./PetPortrait.tsx";

interface Entry {
  id: string;
  name: string;
  icon?: string;
  speciesId?: string;
  hint: string;
}

const STAGE_HINT: Record<string, string> = {
  baby: "生まれたて",
  child: "こどもの姿",
  teen: "ティーンの姿",
  adult: "おとなの姿",
};

const CATALOG: Record<CollectionCategory, Entry[]> = {
  species: SPECIES.filter((s) => s.id !== "egg").map((s) => ({
    id: s.id,
    name: s.name,
    speciesId: s.id,
    hint: `${STAGE_HINT[s.stage] ?? ""}。${s.description}`,
  })),
  food: FOODS.map((f) => ({ id: f.id, name: f.name, icon: f.icon, hint: "ごはんであげてみよう" })),
  treasure: TREASURES.map((t) => ({
    id: t.id,
    name: t.name,
    icon: t.icon,
    hint: t.months ? `${t.months.join("・")}月ごろ、散歩で見つかる` : t.rarity === "rare" ? "めったに見つからない" : "散歩や部屋のすみで",
  })),
  hobby: HOBBIES.map((h) => ({ id: h.id, name: h.name, icon: h.icon, hint: "性格や部屋の家具がきっかけに" })),
  event: EVENT_ENTRIES.map((e) => ({ id: e.id, name: e.name, icon: e.icon, hint: e.hint })),
};

/** 図鑑（仕様書 10.9）。未登録はシルエットとヒント */
export function Encyclopedia() {
  const generation = useStore((s) => s.game!.pet.generation);
  const unread = useStore((s) => s.game!.unread);
  const [data, setData] = useState<CollectionState | null>(null);
  const [category, setCategory] = useState<CollectionCategory>("species");
  const [selected, setSelected] = useState<Entry | null>(null);

  useEffect(() => {
    api.getCollection().then(setData, () => {});
  }, [generation, unread]);

  if (!data) return <section className="page"><p className="muted">よみこみちゅう…</p></section>;

  const found = new Set(data.entries.filter((e) => e.category === category).map((e) => e.entryId));
  const entries = CATALOG[category];
  const next = data.rewards.find((r) => !r.granted);

  return (
    <section className="page">
      <div className="card zukan-rate">
        <div className="pixel">図鑑 {data.rate}%</div>
        <div className="meter-track">
          <span className="meter-fill" style={{ width: `${data.rate}%` }} />
        </div>
        <div className="muted">{next ? `${next.at}% で ${next.name} がもらえる` : "すべてのごほうびをもらった！"}</div>
      </div>

      <div className="segmented" role="tablist">
        {(Object.keys(CATALOG) as CollectionCategory[]).map((c) => (
          <button key={c} role="tab" aria-selected={category === c} className={category === c ? "is-active" : ""} onClick={() => setCategory(c)}>
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>
      <p className="muted">{found.size} / {entries.length}</p>

      <div className="food-grid">
        {entries.map((e) => {
          const known = found.has(e.id);
          return (
            <button key={e.id} className={`food zukan-cell${known ? "" : " is-unknown"}`} onClick={() => setSelected(e)}>
              {e.speciesId ? (
                <PetPortrait speciesId={e.speciesId} stage={SPECIES.find((s) => s.id === e.speciesId)!.stage} silhouette={!known} scale={1.6} />
              ) : (
                <span className="food-icon" aria-hidden>{known ? e.icon : "？"}</span>
              )}
              <span className="food-name">{known ? e.name : "？？？"}</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="card zukan-detail">
          <div className="pixel">{found.has(selected.id) ? selected.name : "？？？"}</div>
          <div className="muted">{found.has(selected.id) ? selected.hint : `ヒント: ${selected.hint}`}</div>
        </div>
      )}
    </section>
  );
}
