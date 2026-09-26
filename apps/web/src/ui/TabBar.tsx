import { useStore, type Tab } from "../store.ts";

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "home", icon: "🏠", label: "ホーム" },
  { id: "diary", icon: "📖", label: "日記" },
  { id: "items", icon: "🎒", label: "もちもの" },
  { id: "collection", icon: "📚", label: "図鑑" },
  { id: "settings", icon: "⚙️", label: "設定" },
];

export function TabBar() {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const unread = useStore((s) => s.game?.unread ?? 0);
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`tab${tab === t.id ? " is-active" : ""}`}
          onClick={() => setTab(t.id)}
          aria-current={tab === t.id ? "page" : undefined}
        >
          <span className="tab-icon" aria-hidden>
            {t.icon}
            {t.id === "diary" && unread > 0 && <span className="badge">{unread > 99 ? "99+" : unread}</span>}
          </span>
          <span className="tab-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
