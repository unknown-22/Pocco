import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, "..", "..", "..");

export const config = {
  port: Number(process.env.POCCO_PORT ?? 8787),
  host: process.env.POCCO_HOST ?? "0.0.0.0",
  dataDir: path.resolve(process.env.POCCO_DATA_DIR ?? path.join(repoRoot, "data")),
  webDist: path.join(repoRoot, "apps", "web", "dist"),
};
