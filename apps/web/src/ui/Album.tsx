import { useEffect, useState } from "react";
import { localParts } from "@pocco/sim";
import { api, type Photo } from "../api.ts";
import { useStore } from "../store.ts";
import { formatClock } from "../time.ts";

/** アルバム（仕様書 10.10）。スマホで撮った写真も PC で見られる */
export function Album() {
  const timezone = useStore((s) => s.game!.timezone);
  const showToast = useStore((s) => s.showToast);
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [open, setOpen] = useState<Photo | null>(null);

  const load = () => api.getPhotos().then((r) => setPhotos(r.photos), () => setPhotos([]));
  useEffect(() => {
    load();
  }, []);

  const when = (t: number) => {
    const p = localParts(t, timezone);
    return `${p.year}/${p.month}/${p.day} ${formatClock(t, timezone)}`;
  };

  const share = async (photo: Photo) => {
    try {
      const blob = await (await fetch(api.photoUrl(photo.id))).blob();
      const file = new File([blob], `pocco-${photo.takenAt}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: photo.caption });
      } else {
        showToast("この端末では共有できません。保存を使ってください");
      }
    } catch {
      /* 共有をキャンセルしたとき */
    }
  };

  const remove = async (photo: Photo) => {
    if (!confirm("この写真を削除しますか？")) return;
    await api.deletePhoto(photo.id);
    setOpen(null);
    load();
  };

  return (
    <section className="page">
      {!photos ? (
        <p className="muted">よみこみちゅう…</p>
      ) : photos.length === 0 ? (
        <div className="empty">
          <p className="pixel">まだ写真がありません</p>
          <p className="muted">ホームの「📷 しゃしん」で撮れます</p>
        </div>
      ) : (
        <div className="album-grid">
          {photos.map((p) => (
            <button key={p.id} className="album-thumb" onClick={() => setOpen(p)}>
              <img src={api.photoUrl(p.id)} alt={p.caption} loading="lazy" />
              {p.kind === "farewell" && <span className="album-tag">🕊️</span>}
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="viewer" role="dialog" aria-label="写真" onClick={() => setOpen(null)}>
          <div className="viewer-body" onClick={(e) => e.stopPropagation()}>
            <img src={api.photoUrl(open.id)} alt={open.caption} />
            <p className="pixel">{open.caption}</p>
            <p className="muted">{when(open.takenAt)}</p>
            <div className="viewer-actions">
              <a className="secondary" href={api.photoUrl(open.id)} download={`pocco-${open.takenAt}.png`}>保存</a>
              <button className="secondary" onClick={() => share(open)}>共有</button>
              <button className="secondary" onClick={() => remove(open)}>削除</button>
              <button className="primary" onClick={() => setOpen(null)}>とじる</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
