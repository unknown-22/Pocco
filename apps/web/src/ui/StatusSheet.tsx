import { TASTE_LABEL, TASTE_TAGS, type Personality } from "@pocco/sim";
import { useStore } from "../store.ts";
import { Sheet } from "./Sheet.tsx";

const NEEDS = [
  { key: "hunger", label: "くうふく", icon: "🍙" },
  { key: "sleepiness", label: "ねむけ", icon: "💤" },
  { key: "boredom", label: "たいくつ", icon: "🌀" },
  { key: "loneliness", label: "さびしさ", icon: "💧" },
] as const;

const AXES: { key: keyof Personality; minus: string; plus: string }[] = [
  { key: "energy", minus: "のんびり", plus: "やんちゃ" },
  { key: "tidiness", minus: "ずぼら", plus: "きちょうめん" },
  { key: "curiosity", minus: "しんちょう", plus: "ぼうけん好き" },
  { key: "attachment", minus: "じりつ", plus: "あまえんぼう" },
  { key: "appetite", minus: "しょうしょく", plus: "くいしんぼう" },
  { key: "chronotype", minus: "あさがた", plus: "よるがた" },
];

/** ようす（仕様書 11.2: 細かい数値はここで確認） */
export function StatusSheet() {
  const game = useStore((s) => s.game)!;
  const setSheet = useStore((s) => s.setSheet);
  const s = game.pet.state;
  const prefs = TASTE_TAGS.map((tag) => ({ tag, v: s.foodPrefs[tag] ?? 0 })).sort((a, b) => b.v - a.v);
  const likes = prefs.filter((p) => p.v >= 20).slice(0, 2);
  const dislikes = prefs.filter((p) => p.v <= -20).slice(-2).reverse();

  return (
    <Sheet title={`${game.pet.name}のようす`} onClose={() => setSheet(null)}>
      <section className="status-section">
        <h3>いまの きもち</h3>
        {NEEDS.map((n) => (
          <div key={n.key} className="meter">
            <span className="meter-label">{n.icon} {n.label}</span>
            <span className="meter-track">
              <span className="meter-fill" style={{ width: `${s.needs[n.key]}%` }} />
            </span>
          </div>
        ))}
      </section>

      <section className="status-section">
        <h3>せいかく</h3>
        {AXES.map((a) => {
          const v = s.personality[a.key];
          return (
            <div key={a.key} className="axis">
              <span className={`axis-end${v < -15 ? " is-on" : ""}`}>{a.minus}</span>
              <span className="axis-track">
                <span
                  className="axis-fill"
                  style={v >= 0 ? { left: "50%", width: `${v / 2}%` } : { left: `${50 + v / 2}%`, width: `${-v / 2}%` }}
                />
              </span>
              <span className={`axis-end${v > 15 ? " is-on" : ""}`}>{a.plus}</span>
            </div>
          );
        })}
      </section>

      <section className="status-section">
        <h3>たべものの このみ</h3>
        <p>すき: {likes.length ? likes.map((p) => TASTE_LABEL[p.tag]).join("・") : "まだ わからない"}</p>
        <p>にがて: {dislikes.length ? dislikes.map((p) => TASTE_LABEL[p.tag]).join("・") : "とくになし"}</p>
      </section>
    </Sheet>
  );
}
