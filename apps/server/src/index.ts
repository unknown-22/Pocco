import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { config } from "./config.ts";
import { openDb } from "./db.ts";
import { createApp } from "./app.ts";

fs.mkdirSync(config.dataDir, { recursive: true });
const db = openDb(path.join(config.dataDir, "pocco.db"));
const app = createApp(db);

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
});

function shutdown() {
  db.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
