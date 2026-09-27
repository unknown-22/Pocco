import { useState, type FormEvent } from "react";
import { useStore } from "../store.ts";
import { applyTheme, loadThemeChoice, saveThemeChoice, type ThemeChoice } from "../theme.ts";

const THEMES: [ThemeChoice, string][] = [
  ["auto", "自動"],
  ["light", "ライト"],
  ["dark", "ダーク"],
];

export function Settings() {
  const game = useStore((s) => s.game);
  const send = useStore((s) => s.send);
  const debugAdvance = useStore((s) => s.debugAdvance);
  const [name, setName] = useState(game?.pet?.name ?? "");
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState(loadThemeChoice);

  const onTheme = (choice: ThemeChoice) => {
    setTheme(choice);
    saveThemeChoice(choice);
    applyTheme(choice);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await send({ type: "rename", name });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <section className="page">
      <h2 className="page-title pixel">設定</h2>
      <form className="card" onSubmit={onSubmit}>
        <label className="field">
          <span>なまえ</span>
          <input value={name} maxLength={12} onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="primary" disabled={!name.trim() || name === game?.pet?.name}>
          {saved ? "保存しました" : "保存"}
        </button>
      </form>
      <div className="card">
        <span className="field">画面の色</span>
        <div className="segmented" role="radiogroup" aria-label="画面の色">
          {THEMES.map(([value, label]) => (
            <button key={value} type="button" role="radio" aria-checked={theme === value} className={theme === value ? "is-active" : ""} onClick={() => onTheme(value)}>
              {label}
            </button>
          ))}
        </div>
        <div className="muted">「自動」は端末の設定に合わせます。この端末だけに保存されます</div>
      </div>
      <div className="card muted">
        <div>タイムゾーン: {game?.timezone}</div>
        <div>世代: {game?.pet?.generation}</div>
      </div>
      {game?.debug && (
        <div className="card">
          <div className="pixel">🛠 デバッグ: 時間を進める</div>
          <div className="debug-row">
            {[
              [10, "+10分"],
              [60, "+1時間"],
              [6 * 60, "+6時間"],
              [24 * 60, "+1日"],
            ].map(([min, label]) => (
              <button key={min} className="secondary" onClick={() => debugAdvance(min as number)}>
                {label}
              </button>
            ))}
          </div>
          <div className="muted">サーバーを再起動すると元の時刻に戻ります</div>
        </div>
      )}
    </section>
  );
}
