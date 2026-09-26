import { useEffect, useMemo, useState } from "react";
import type { TimelineEntry } from "../api.ts";
import { serverNow, useStore } from "../store.ts";
import { dayLabel, formatClock, formatDuration } from "../time.ts";
import { EVENT_ICON } from "./labels.ts";

/** 日記（仕様書 9 章）。開いたときの未読を覚えておき、強調表示してから既読にする。 */
export function Diary() {
  const game = useStore((s) => s.game)!;
  const { entries, hasMore, loading } = useStore((s) => s.timeline);
  const loadTimeline = useStore((s) => s.loadTimeline);
  const markRead = useStore((s) => s.markRead);
  const [unreadIds, setUnreadIds] = useState<Set<number>>(new Set());

  // 開いたとき、および新しい日記が増えたときに読み直す
  useEffect(() => {
    loadTimeline();
  }, [loadTimeline, game.unread]);

  useEffect(() => {
    const unread = entries.filter((e) => !e.read);
    if (unread.length === 0) return;
    setUnreadIds((prev) => new Set([...prev, ...unread.map((e) => e.id)]));
    markRead(Math.max(...entries.map((e) => e.id)));
  }, [entries, markRead]);

  const unreadEntries = entries.filter((e) => unreadIds.has(e.id));
  const groups = useMemo(() => groupByDay(entries, game.timezone), [entries, game.timezone]);

  return (
    <section className="page">
      <h2 className="page-title pixel">日記</h2>
      {unreadEntries.length > 0 && (
        <AbsenceSummary entries={unreadEntries} absence={game.absence} />
      )}
      {entries.length === 0 && !loading && (
        <div className="empty">
          <p className="pixel">まだ なにも かかれていない</p>
          <p className="muted">しばらくすると、ここに毎日のできごとが書かれていきます</p>
        </div>
      )}
      {groups.map(([day, items]) => (
        <div key={day} className="diary-day">
          <h3 className="diary-date pixel">{day}</h3>
          <ol className="diary-list">
            {items.map((e) => (
              <li
                key={e.id}
                className={[
                  "diary-entry",
                  `is-${e.importance}`,
                  e.kind === "user" ? "is-user" : "",
                  unreadIds.has(e.id) ? "is-unread" : "",
                ].join(" ")}
              >
                <time className="diary-time pixel">
                  {formatClock(e.at, game.timezone)}
                  {e.endAt && <span className="diary-until">〜{formatClock(e.endAt, game.timezone)}</span>}
                </time>
                <span className="diary-icon" aria-hidden>{EVENT_ICON[e.eventId] ?? (e.importance === "major" ? "⭐" : "・")}</span>
                <span className="diary-text">{e.text}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}
      {hasMore && (
        <button className="secondary" disabled={loading} onClick={() => loadTimeline(true)}>
          もっと前を読む
        </button>
      )}
    </section>
  );
}

function AbsenceSummary({
  entries,
  absence,
}: {
  entries: TimelineEntry[];
  absence: { from: number; to: number } | null;
}) {
  const count = (...ids: string[]) => entries.filter((e) => ids.includes(e.eventId)).length;
  const stats = [
    { label: "眠った", n: count("sleep", "nap"), unit: "回" },
    { label: "冷蔵庫", n: count("eat"), unit: "回" },
    { label: "遊んだ", n: count("play"), unit: "回" },
    { label: "見つけた物", n: count("find"), unit: "個" },
  ].filter((s) => s.n > 0);
  const major = entries.filter((e) => e.importance === "major");

  return (
    <div className="card summary">
      <div className="summary-title pixel">
        🕒 {absence ? `${formatDuration(absence.to - absence.from)}ぶりだね` : "おかえり"}
      </div>
      <div className="summary-sub muted">留守のあいだに {entries.length} 件のできごと</div>
      {stats.length > 0 && (
        <div className="summary-stats">
          {stats.map((s) => (
            <span key={s.label} className="summary-stat">
              {s.label} <b>{s.n}</b>{s.unit}
            </span>
          ))}
        </div>
      )}
      {major.map((e) => (
        <div key={e.id} className="summary-major pixel">★ {e.text}</div>
      ))}
    </div>
  );
}

function groupByDay(entries: TimelineEntry[], timezone: string): [string, TimelineEntry[]][] {
  const now = serverNow();
  const groups = new Map<string, TimelineEntry[]>();
  for (const e of entries) {
    const label = dayLabel(e.at, now, timezone);
    const list = groups.get(label) ?? [];
    list.push(e);
    groups.set(label, list);
  }
  return [...groups];
}
