# Pocco — 開発メモ

放置型の電子ペット Web アプリ。仕様は `docs/SPEC.md`（決定事項は 15 章、各フェーズの実装メモは 4.6 / 7.6 / 10.11〜10.13）。

## コマンド

- `npm test` — Vitest（sim・server・web の全テスト）
- `npm run typecheck` — 3 パッケージの型チェック
- `npm run dev` — API :8787 + Vite :5173（時間の早送りが有効）
- `npm run build && npm start` — 本番

## 構成と方針

- `packages/sim`: 生活シミュレーション。**純関数**（状態 + 時刻 → 新しい状態 + 出来事）。乱数は `hashSeed(petId, t)` で決定論的。tick は 10 分境界にそろえる（定期実行とまとめ計算が同じ結果になる）
- `apps/server`: Hono + better-sqlite3。サーバーが唯一の正。画面からは操作（`POST /api/actions`、`clientActionId` で二重処理防止）だけを送る。`advance()` がキャッチアップ・世代交代・図鑑ごほうびを担当。DB 変更は `db.ts` の `MIGRATIONS` に追記
- `apps/web`: React + Canvas 2D（128×128 を整数倍で拡大）。細かい動きは画面側の演出で状態を変えない。ミニゲームは結果だけ送る
- 文言・コメントは日本語。死は寿命だけ（放置で死なない・早死にしない）

## 動作確認のコツ

- `POCCO_DEBUG=1 POCCO_DATA_DIR=<一時フォルダ> npm start` で起動し、`POST /api/debug/advance {"minutes":N}` で早送り。早送りはメモリ上だけなので、再起動すると時計が戻る（一時フォルダを使い捨てる）
- Playwright（グローバル）で画面を撮って確認できる
