import { APP_VERSION, CHANGELOG, type Release } from "../changelog.ts";
import { Sheet } from "./Sheet.tsx";

function ReleaseDetails({ release }: { release: Release }) {
  return (
    <>
      <p className="muted changelog-date">
        {release.date ? <time dateTime={release.date}>{release.date.replaceAll("-", "/")}</time> : "公開日未記録"}
      </p>
      <ul className="changelog-items">
        {release.items.map((item, index) => (
          <li key={index}>
            <span className="changelog-category">{item.category}</span>
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function ChangelogSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="更新履歴" onClose={onClose}>
      <p className="muted">いまのバージョン: {APP_VERSION}</p>
      <div className="changelog-list">
        {CHANGELOG.map((release, index) => index === 0 ? (
          <article className="changelog-release" key={release.version}>
            <h3 className="changelog-title"><span className="pixel">v{release.version}</span>{release.title}</h3>
            <ReleaseDetails release={release} />
          </article>
        ) : (
          <details className="changelog-release" key={release.version}>
            <summary className="changelog-title"><span className="pixel">v{release.version}</span>{release.title}</summary>
            <ReleaseDetails release={release} />
          </details>
        ))}
      </div>
    </Sheet>
  );
}
