import { useState } from "react";
import { useStore } from "../store.ts";
import { captureRoom, uploadPhoto } from "../photo.ts";
import { MiniGame } from "../minigames/MiniGame.tsx";

export function ActionBar() {
  const game = useStore((s) => s.game)!;
  const send = useStore((s) => s.send);
  const setSheet = useStore((s) => s.setSheet);
  const egg = game.pet.state.stage === "egg";
  const away = game.pet.state.activity.type === "out" || game.pet.state.stage === "departed";
  const lightsOff = Boolean(game.room.lightsOff);
  const showToast = useStore((s) => s.showToast);
  const [flash, setFlash] = useState(false);
  const [playing, setPlaying] = useState(false);
  const asleep = game.pet.state.activity.type === "sleep" || game.pet.state.activity.type === "nap";

  const takePhoto = async () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 250);
    try {
      await uploadPhoto(await captureRoom());
      showToast("📷 写真をアルバムに保存しました");
    } catch {
      showToast("写真を保存できませんでした");
    }
  };

  const actions = [
    { id: "feed", icon: "🍙", label: "ごはん", disabled: egg || away, onClick: () => setSheet("food") },
    { id: "play", icon: "🎾", label: "あそぶ", disabled: egg || away || asleep, onClick: () => setPlaying(true) },
    {
      id: "clean",
      icon: "🧹",
      label: "そうじ",
      disabled: game.room.litter.length === 0 && game.room.mess < 5,
      onClick: () => send({ type: "clean" }),
    },
    {
      id: "lights",
      icon: lightsOff ? "🌙" : "💡",
      label: lightsOff ? "つける" : "けす",
      onClick: () => send({ type: "lights", on: lightsOff }),
    },
    { id: "photo", icon: "📷", label: "しゃしん", onClick: takePhoto },
  ];

  return (
    <nav className="actions" aria-label="おせわ">
      {flash && <div className="flash" aria-hidden />}
      {playing && <MiniGame onClose={() => setPlaying(false)} />}
      {actions.map((a) => (
        <button key={a.id} className="action" disabled={a.disabled} onClick={a.onClick}>
          <span className="action-icon" aria-hidden>{a.icon}</span>
          <span className="action-label">{a.label}</span>
        </button>
      ))}
    </nav>
  );
}
