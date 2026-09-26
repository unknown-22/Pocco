import { useStore } from "../store.ts";

export function ActionBar() {
  const game = useStore((s) => s.game)!;
  const send = useStore((s) => s.send);
  const setSheet = useStore((s) => s.setSheet);
  const egg = game.pet.state.stage === "egg";
  const lightsOff = Boolean(game.room.lightsOff);

  const actions = [
    { id: "feed", icon: "🍙", label: "ごはん", disabled: egg, onClick: () => setSheet("food") },
    { id: "play", icon: "🎾", label: "あそぶ", disabled: true, title: "ミニゲームは P5 で追加します" },
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
    { id: "photo", icon: "📷", label: "しゃしん", disabled: true, title: "写真は P4 で追加します" },
  ];

  return (
    <nav className="actions" aria-label="おせわ">
      {actions.map((a) => (
        <button key={a.id} className="action" disabled={a.disabled} title={a.title} onClick={a.onClick}>
          <span className="action-icon" aria-hidden>{a.icon}</span>
          <span className="action-label">{a.label}</span>
        </button>
      ))}
    </nav>
  );
}
