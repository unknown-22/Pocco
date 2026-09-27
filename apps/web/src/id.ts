// 操作の ID（clientActionId）を作る。
// crypto.randomUUID は安全な接続（HTTPS・localhost）でしか使えないので、
// LAN の HTTP（スマホから IP アドレスで開く）でも使える getRandomValues で作る。

export function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40; // バージョン 4
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
