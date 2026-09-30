import { useEffect, useMemo, useRef, useState } from "react";
import { useStore as useTimelineStore } from "zustand";
import { api, type MemorialPet, type TimelineEntry } from "../api.ts";
import { serverNow, useStore } from "../store.ts";
import { dayLabel, formatClock, formatDuration } from "../time.ts";
import { eventIcon } from "./labels.ts";
import { createDiaryTimeline } from "./diaryTimeline.ts";
import "./Diary.css";

/** 日記タブから、今の子と歴代の子の日記を切り替える。 */
export function Diary() {
  const pet = useStore((s) => s.game!.pet);
  const [pets, setPets] = useState<MemorialPet[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const petId = selectedId ?? pet.id;

  useEffect(() => {
    let active = true;
    setFailed(false);
    api.getMemorial().then(
      (result) => { if (active) setPets(result.pets); },
      () => { if (active) setFailed(true); },
    );
    return () => { active = false; };
  }, [pet.id, retry]);

  return (
    <section className="page">
      <h2 className="page-title pixel">日記</h2>
      <label className="diary-generation field">
        <span>読む世代</span>
        <select value={petId} onChange={(event) => setSelectedId(event.target.value === pet.id ? null : event.target.value)}>
          <option value={pet.id}>{pet.generation}代目・{pet.name}（今の子）</option>
          {pets.filter((p) => p.id !== pet.id).sort((a, b) => b.generation - a.generation).map((p) => (
            <option key={p.id} value={p.id}>{p.generation}代目・{p.name}</option>
          ))}
        </select>
      </label>
      {failed && (
        <div role="alert" className="diary-error">
          <p className="muted">世代の一覧を読み込めませんでした</p>
          <button className="secondary" onClick={() => setRetry((n) => n + 1)}>もう一度読み込む</button>
        </div>
      )}
      <DiaryEntries key={petId} petId={petId} isCurrent={petId === pet.id} />
    </section>
  );
}

/** 世代を切り替えると一覧・カーソル・未読の強調もまとめて切り替わる。 */
function DiaryEntries({ petId, isCurrent }: { petId: string; isCurrent: boolean }) {
  const game = useStore((s) => s.game)!;
  const [timeline] = useState(() => createDiaryTimeline(petId));
  const { entries, hasMore, loading, error, load, retry } = useTimelineStore(timeline);
  const markRead = useStore((s) => s.markRead);
  const [unreadIds, setUnreadIds] = useState<Set<number>>(new Set());
  const [absence, setAbsence] = useState(game.absence);
  const previousUnread = useRef(game.unread);

  useEffect(() => { void load(); }, [load]);

  // 新着だけ読み直す。既読にした通知では、読み進めたページを消さない。
  useEffect(() => {
    if (isCurrent && game.unread > previousUnread.current) void load();
    previousUnread.current = game.unread;
  }, [load, game.unread, isCurrent]);

  useEffect(() => {
    if (!isCurrent) return;
    const unread = entries.filter((e) => !e.read);
    if (unread.length === 0) return;
    setUnreadIds((prev) => new Set([...prev, ...unread.map((e) => e.id)]));
    const current = useStore.getState().game?.absence;
    if (current) setAbsence(current);
    markRead(Math.max(...entries.map((e) => e.id)));
  }, [entries, markRead, isCurrent]);

  const unreadEntries = entries.filter((e) => unreadIds.has(e.id));
  const groups = useMemo(() => groupByDay(entries, game.timezone), [entries, game.timezone]);

  return (
    <div aria-busy={loading}>
      {isCurrent && unreadEntries.length > 0 && (
        <AbsenceSummary entries={unreadEntries} absence={absence} />
      )}
      {entries.length === 0 && !loading && !error && (
        <div className="empty">
          <p className="pixel">まだ なにも かかれていない</p>
          <p className="muted">{isCurrent ? "しばらくすると、ここに毎日のできごとが書かれていきます" : "この世代の日記はありません"}</p>
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
                  isCurrent && unreadIds.has(e.id) ? "is-unread" : "",
                ].join(" ")}
              >
                <time className="diary-time pixel">
                  {formatClock(e.at, game.timezone)}
                  {e.endAt && <span className="diary-until">〜{formatClock(e.endAt, game.timezone)}</span>}
                </time>
                <span className="diary-icon" aria-hidden>{eventIcon(e)}</span>
                <span className="diary-text">{e.text}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}
      {loading && <p className="muted" role="status">よみこみちゅう…</p>}
      {error && (
        <div role="alert" className="diary-error">
          <p className="muted">{error}</p>
          <button className="secondary" disabled={loading} onClick={() => retry()}>
            もう一度読み込む
          </button>
        </div>
      )}
      {hasMore && !error && (
        <button className="secondary" disabled={loading} onClick={() => load(true)}>
          もっと前を読む
        </button>
      )}
    </div>
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
    { label: "眠った", n: count("sleep_start", "nap_start", "sleep", "nap"), unit: "回" },
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
