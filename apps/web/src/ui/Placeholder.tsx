export function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <section className="page">
      <h2 className="page-title pixel">{title}</h2>
      <div className="empty">
        <p className="pixel">じゅんびちゅう…</p>
        <p className="muted">{note}</p>
      </div>
    </section>
  );
}
