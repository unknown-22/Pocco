import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import rootPackage from "../../../package.json";
import webPackage from "../package.json";
import serverPackage from "../../server/package.json";
import simPackage from "../../../packages/sim/package.json";
import lockfile from "../../../package-lock.json";
import { APP_VERSION, CHANGELOG, CHANGE_CATEGORIES } from "./changelog.ts";
import { ChangelogSheet } from "./ui/ChangelogSheet.tsx";
import { Settings } from "./ui/Settings.tsx";

const versionParts = (version: string) => version.split(".").map(Number);
function newerThan(a: string, b: string) {
  const left = versionParts(a);
  const right = versionParts(b);
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i]! > right[i]!;
  }
  return false;
}

describe("更新履歴", () => {
  it("JSON の最新版と全パッケージ・ロックファイルの版が一致する", () => {
    expect(CHANGELOG.length).toBeGreaterThan(0);
    for (const pkg of [rootPackage, webPackage, serverPackage, simPackage]) {
      expect(pkg.version).toBe(APP_VERSION);
    }
    expect(lockfile.version).toBe(APP_VERSION);
    for (const path of ["", "apps/web", "apps/server", "packages/sim"] as const) {
      expect(lockfile.packages[path].version).toBe(APP_VERSION);
    }
  });

  it("新しい版から重複なく並び、見出し・分類・本文が揃っている", () => {
    const versions = CHANGELOG.map((entry) => entry.version);
    expect(new Set(versions).size).toBe(versions.length);
    for (const [index, release] of CHANGELOG.entries()) {
      expect(release.version).toMatch(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
      expect(release.title.trim()).not.toBe("");
      expect(release.items.length).toBeGreaterThan(0);
      for (const item of release.items) {
        expect(CHANGE_CATEGORIES).toContain(item.category);
        expect(item.text.trim()).not.toBe("");
      }
      if (index > 0) expect(newerThan(CHANGELOG[index - 1]!.version, release.version)).toBe(true);
    }
  });

  it("日付は実在する YYYY-MM-DD、未確定・未記録なら null", () => {
    for (const { date } of CHANGELOG) {
      if (date === null) continue;
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10)).toBe(date);
    }
  });

  it("設定は現在の版と入口を表示し、自動でシートを開かない", () => {
    const html = renderToStaticMarkup(createElement(Settings));
    expect(html).toContain(`v${APP_VERSION}`);
    expect(html).toContain("更新履歴");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain('role="dialog"');
  });

  it("既存の Sheet に最新版を展開し、過去の版を閉じた状態で表示する", () => {
    const html = renderToStaticMarkup(createElement(ChangelogSheet, { onClose: () => {} }));
    expect(html).toContain('role="dialog" aria-label="更新履歴"');
    expect(html).toContain('aria-label="とじる"');
    expect(html).toContain(CHANGELOG[0]!.title);
    expect(html).toContain(CHANGELOG[0]!.items[0]!.text);
    expect(html.match(/<details\b/g)?.length ?? 0).toBe(CHANGELOG.length - 1);
    expect(html).not.toMatch(/<details[^>]*\bopen\b/);
    expect(html.indexOf(`v${APP_VERSION}`)).toBeLessThan(html.indexOf(`v${CHANGELOG.at(-1)!.version}`));
  });
});
