// おせわボタン。各機能は P2 以降で実装する。

const ACTIONS = [
  { id: "feed", icon: "🍙", label: "ごはん" },
  { id: "play", icon: "🎾", label: "あそぶ" },
  { id: "clean", icon: "🧹", label: "そうじ" },
  { id: "lights", icon: "💡", label: "でんき" },
  { id: "photo", icon: "📷", label: "しゃしん" },
] as const;

export function ActionBar() {
  return (
    <nav className="actions" aria-label="おせわ">
      {ACTIONS.map((a) => (
        <button key={a.id} className="action" disabled title="準備中">
          <span className="action-icon" aria-hidden>{a.icon}</span>
          <span className="action-label">{a.label}</span>
        </button>
      ))}
    </nav>
  );
}
