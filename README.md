# Pocco

たまごっちを現代風にアレンジした、放置型の電子ペット Web アプリ。
LAN 内のサーバー（Windows ミニ PC を想定）にデータを置き、スマホと PC のブラウザから同じペットにアクセスします。

- 仕様書: [docs/SPEC.md](docs/SPEC.md)

## 必要なもの

- Node.js 22 以上（LTS）

## 使い方

```sh
npm install

# 本番（サーバーがビルド済みの画面も配信する）
npm run build
npm start          # http://<サーバーのIP>:8787
```

起動時に LAN 用の URL がコンソールに表示されます。スマホからはその URL を開いてください。
自動起動・スリープ設定はこのプロジェクトの外で管理します。

### 開発

```sh
npm run dev        # API: 8787 / 画面: http://localhost:5173（LAN からも開ける）
npm test           # Vitest
npm run typecheck
```

## 設定（環境変数）

| 変数 | 既定値 | 内容 |
|---|---|---|
| `POCCO_PORT` | `8787` | 待ち受けポート |
| `POCCO_HOST` | `0.0.0.0` | 待ち受けアドレス |
| `POCCO_DATA_DIR` | `<リポジトリ>/data` | `pocco.db` を置くフォルダ |
| `POCCO_DEBUG` | `npm run dev` では `1`、それ以外は `0` | `1` で設定画面に時間の早送りボタンを出す（本番データでは使わないこと） |

Windows ではファイアウォールで `POCCO_PORT` の受信をプライベートネットワークに限って許可してください。
認証がないため、インターネットには公開しないでください。

## 構成

```
packages/sim   シミュレーションエンジン（UI・DB 非依存）
apps/server    API + SQLite + 画面の配信（Hono）
apps/web       クライアント（React + Canvas）
```
