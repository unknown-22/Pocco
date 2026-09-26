import type { ReactNode } from "react";

/** 画面下から出るシート */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2 className="pixel">{title}</h2>
          <button className="sheet-close" onClick={onClose} aria-label="とじる">✕</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
