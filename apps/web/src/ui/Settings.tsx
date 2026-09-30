import { useEffect, useRef, useState, type FormEvent } from "react";
import { useStore } from "../store.ts";
import { applyTheme, loadThemeChoice, saveThemeChoice, type ThemeChoice } from "../theme.ts";
import { APP_VERSION } from "../changelog.ts";
import { ChangelogSheet } from "./ChangelogSheet.tsx";

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
  const [showChangelog, setShowChangelog] = useState(false);
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState(loadThemeChoice);
  const [timezone, setTimezone] = useState(game?.timezone ?? "Asia/Tokyo");
  const timeValue = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  const [bedtime, setBedtime] = useState(timeValue(game?.sleepStartMinutes ?? 1380));
  const [settingsError, setSettingsError] = useState("");
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const submittingSettings = useRef(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  useEffect(() => {
    if (game && !settingsDirty) {
      setTimezone(game.timezone);
      setBedtime(timeValue(game.sleepStartMinutes));
    }
  }, [game?.timezone, game?.sleepStartMinutes, settingsDirty]);

  const onSettingsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submittingSettings.current) return;
    setSettingsError("");
    setSettingsSaved(false);
    if (!/^\d{2}:\d{2}$/.test(bedtime)) {
      setSettingsError("就寝時刻を入力してください");
      return;
    }
    const [hours, minutes] = bedtime.split(":").map(Number);
    if (hours! > 23 || minutes! > 59) {
      setSettingsError("就寝時刻を確認してください");
      return;
    }
    try {
      if (!timezone.trim()) throw new Error();
      new Intl.DateTimeFormat("ja", { timeZone: timezone.trim() });
    } catch {
      setSettingsError("タイムゾーンを確認してください（例: Asia/Tokyo）");
      return;
    }
    submittingSettings.current = true;
    setSavingSettings(true);
    const result = await send({ type: "settings", timezone: timezone.trim(), sleepStartMinutes: hours! * 60 + minutes! });
    submittingSettings.current = false;
    setSavingSettings(false);
    if (result) {
      setTimezone(result.timezone);
      setBedtime(timeValue(result.sleepStartMinutes));
      setSettingsDirty(false);
      setSettingsSaved(true);
    } else {
      setSettingsError("保存できませんでした。入力内容を確認して、もう一度お試しください");
    }
  };

  const onTheme = (choice: ThemeChoice) => {
    setTheme(choice);
    saveThemeChoice(choice);
    applyTheme(choice);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const result = await send({ type: "rename", name });
    if (!result) return;
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
      <form className="card" onSubmit={onSettingsSubmit}>
        <label className="field">
          <span>タイムゾーン</span>
          <input value={timezone} maxLength={100} list="timezones" required disabled={savingSettings} onChange={(e) => { setTimezone(e.target.value); setSettingsDirty(true); setSettingsSaved(false); }} />
          <datalist id="timezones">
            {["Asia/Tokyo", "Asia/Seoul", "Asia/Shanghai", "Asia/Singapore", "Europe/London", "Europe/Paris", "America/New_York", "America/Los_Angeles", "Pacific/Honolulu", "Australia/Sydney", "UTC"].map((zone) => <option key={zone} value={zone} />)}
          </datalist>
        </label>
        <label className="field">
          <span>就寝時刻</span>
          <input type="time" value={bedtime} required disabled={savingSettings} onChange={(e) => { setBedtime(e.target.value); setSettingsDirty(true); setSettingsSaved(false); }} />
        </label>
        <p className="muted">設定はすべての端末・世代で共有されます。睡眠は約 8 時間で、性格により前後 2 時間ずれます。変更はこれからの生活に反映されます。</p>
        {settingsError && <p role="alert">{settingsError}</p>}
        <button className="primary" disabled={savingSettings || !settingsDirty || !timezone.trim() || !bedtime}>
          {savingSettings ? "保存中…" : "生活の設定を保存"}
        </button>
        {settingsSaved && <p role="status">保存しました</p>}
      </form>
      <div className="card">
        <div className="app-version">Pocco <span className="muted">v{APP_VERSION}</span></div>
        <button type="button" className="secondary" aria-haspopup="dialog" onClick={() => setShowChangelog(true)}>
          更新履歴
        </button>
      </div>
      {showChangelog && <ChangelogSheet onClose={() => setShowChangelog(false)} />}
      <div className="card muted">世代: {game?.pet?.generation}</div>
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
