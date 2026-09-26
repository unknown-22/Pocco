import { useEffect, useState } from "react";
import { getFood, getHobby, getTreasure, localParts } from "@pocco/sim";
import { api, type MemorialPet, type Photo, type TimelineEntry } from "../api.ts";
import { useStore } from "../store.ts";
import { formatClock } from "../time.ts";
import { PetPortrait } from "./PetPortrait.tsx";
import { ItemIcon } from "./ItemIcon.tsx";
import { daysLived, eventIcon } from "./labels.ts";

const TRAITS: Record<string, [string, string]> = {
  energy: ["のんびり", "やんちゃ"],
  tidiness: ["ずぼら", "きちょうめん"],
  curiosity: ["しんちょう", "ぼうけん好き"],
  attachment: ["じりつ", "あまえんぼう"],
  appetite: ["しょうしょく", "くいしんぼう"],
  chronotype: ["あさがた", "よるがた"],
};

/** 目立つ性格を 2 つ */
function traits(p: Record<string, number>): string {
  const top = Object.entries(p)
    .filter(([, v]) => Math.abs(v) >= 20)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 2)
    .map(([k, v]) => TRAITS[k]?.[v > 0 ? 1 : 0]);
  return top.length ? top.join("・") : "おだやか";
}

/** 思い出（仕様書 7.5）。歴代のペットを世代順に並べる */
export function Memorial() {
  const timezone = useStore((s) => s.game!.timezone);
  const generation = useStore((s) => s.game!.pet.generation);
  const [pets, setPets] = useState<MemorialPet[] | null>(null);
  const [open, setOpen] = useState<MemorialPet | null>(null);

  useEffect(() => {
    api.getMemorial().then((r) => setPets(r.pets), () => setPets([]));
  }, [generation]);

  const date = (t: number) => {
    const p = localParts(t, timezone);
    return `${p.month}/${p.day}`;
  };

  if (open) return <MemorialDetail pet={open} onBack={() => setOpen(null)} />;

  return (
    <section className="page">
      {!pets ? (
        <p className="muted">よみこみちゅう…</p>
      ) : (
        <div className="family">
          {[...pets].reverse().map((p) => (
            <button key={p.id} className="card family-card" onClick={() => setOpen(p)}>
              <PetPortrait speciesId={p.speciesId} stage={p.stage === "departed" ? "adult" : p.stage} scale={2} />
              <span className="family-text">
                <span className="pixel family-name">
                  {p.name} <span className="muted">{p.generation}代目</span>
                </span>
                <span className="muted">
                  {p.speciesName}・{traits(p.personality)}
                </span>
                <span className="muted">
                  {p.diedAt
                    ? `${date(p.bornAt)} 〜 ${date(p.diedAt)}（${daysLived(p.bornAt, p.diedAt)}日）`
                    : `${date(p.bornAt)} 〜 いっしょに暮らしている`}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function MemorialDetail({ pet, onBack }: { pet: MemorialPet; onBack: () => void }) {
  const timezone = useStore((s) => s.game!.timezone);
  const [diary, setDiary] = useState<TimelineEntry[] | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  useEffect(() => {
    api.getPhotos(pet.id).then((r) => setPhotos(r.photos), () => {});
  }, [pet.id]);
  const food = pet.favoriteFood ? getFood(pet.favoriteFood) : undefined;
  const keepsake = pet.keepsakeItemId ? getTreasure(pet.keepsakeItemId) : undefined;
  const dateTime = (t: number) => {
    const p = localParts(t, timezone);
    return `${p.month}/${p.day} ${formatClock(t, timezone)}`;
  };

  return (
    <section className="page">
      <button className="secondary back" onClick={onBack}>‹ 思い出にもどる</button>
      <div className="card memorial-head">
        <PetPortrait speciesId={pet.speciesId} stage={pet.stage === "departed" ? "adult" : pet.stage} scale={4} />
        <div className="pixel family-name">{pet.name}</div>
        <div className="muted">
          {pet.generation}代目・{pet.speciesName}
          {pet.diedAt && `・${daysLived(pet.bornAt, pet.diedAt)}日 生きた`}
        </div>
      </div>

      <div className="card memorial-facts">
        <div>せいかく: {traits(pet.personality)}</div>
        <div>しゅみ: {pet.hobbies.length ? pet.hobbies.map((h) => getHobby(h)?.name).join("・") : "なし"}</div>
        <div>
          好きだった食べ物:{" "}
          {food ? (
            <>
              <ItemIcon kind="food" id={food.id} size={16} fallback={food.icon} inline /> {food.name}
            </>
          ) : (
            "—"
          )}
        </div>
        {keepsake && (
          <div>
            形見: <ItemIcon kind="treasure" id={keepsake.id} size={16} fallback={keepsake.icon} inline /> {keepsake.name}
          </div>
        )}
      </div>

      {pet.lastWords && (
        <div className="card letter-body pixel">
          {pet.lastWords.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
          <p className="muted">{pet.witnessed ? "（最後のひとこと）" : "（置き手紙）"}</p>
        </div>
      )}

      {photos.length > 0 && (
        <>
          <h3 className="section-title">写真</h3>
          <div className="album-grid">
            {photos.map((p) => (
              <a key={p.id} className="album-thumb" href={api.photoUrl(p.id)} target="_blank" rel="noreferrer">
                <img src={api.photoUrl(p.id)} alt={p.caption} loading="lazy" />
              </a>
            ))}
          </div>
        </>
      )}

      <h3 className="section-title">大事なできごと</h3>
      <ol className="diary-list is-dated">
        {pet.highlights.map((e) => (
          <li key={e.id} className={`diary-entry is-${e.importance}`}>
            <time className="diary-time pixel">{dateTime(e.at)}</time>
            <span className="diary-icon" aria-hidden>{eventIcon(e)}</span>
            <span className="diary-text">{e.text}</span>
          </li>
        ))}
      </ol>

      {diary === null ? (
        <button className="secondary" onClick={() => api.getTimeline(undefined, 100, pet.id).then((r) => setDiary(r.entries))}>
          日記を読む（新しい順に 100 件）
        </button>
      ) : (
        <ol className="diary-list is-dated">
          {diary.map((e) => (
            <li key={e.id} className={`diary-entry is-${e.importance}${e.kind === "user" ? " is-user" : ""}`}>
              <time className="diary-time pixel">{dateTime(e.at)}</time>
              <span className="diary-icon" aria-hidden>{eventIcon(e)}</span>
              <span className="diary-text">{e.text}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
