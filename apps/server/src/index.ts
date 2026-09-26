import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { config } from "./config.ts";
import { openDb } from "./db.ts";
import { createApp } from "./app.ts";
import { advance } from "./world.ts";

fs.mkdirSync(config.dataDir, { recursive: true });
const db = openDb(path.join(config.dataDir, "pocco.db"));

// 開発用の時間早送り（POCCO_DEBUG=1 のときだけ）。ずらした分はメモリ上だけで、再起動で戻る
let offset = 0;
const clock = () => Date.now() + offset;
const app = createApp(db, {
  clock,
  debug: config.debug ? { advance: (ms) => (offset += ms) } : undefined,
});

// 誰も開いていなくても日記が進むように、1 分ごとに世界を進める（仕様書 4.1）
const timer = setInterval(() => {
  try {
    advance(db, clock());
  } catch (e) {
    console.error("advance failed", e);
  }
}, 60_000);

// ビルド済みのクライアントがあれば一緒に配信する
if (fs.existsSync(config.webDist)) {
  const root = path.relative(process.cwd(), config.webDist);
  app.use("/*", serveStatic({ root }));
  app.get("*", serveStatic({ root, path: "index.html" }));
}

serve({ fetch: app.fetch, port: config.port, hostname: config.host }, () => {
  console.log(`Pocco server: http://localhost:${config.port}`);
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === "IPv4" && !a.internal) console.log(`  LAN: http://${a.address}:${config.port}`);
    }
  }
  console.log(`  data: ${config.dataDir}`);
  if (config.debug) console.log("  debug: time fast-forward enabled");
});

function shutdown() {
  clearInterval(timer);
  db.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
