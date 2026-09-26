import { useState, type FormEvent } from "react";
import { useStore } from "../store.ts";

export function Settings() {
  const game = useStore((s) => s.game);
  const send = useStore((s) => s.send);
  const [name, setName] = useState(game?.pet?.name ?? "");
  const [saved, setSaved] = useState(false);

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
      <div className="card muted">
        <div>タイムゾーン: {game?.timezone}</div>
        <div>世代: {game?.pet?.generation}</div>
      </div>
    </section>
  );
}
