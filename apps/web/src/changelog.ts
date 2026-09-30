import history from "./changelog.json";

export const CHANGE_CATEGORIES = ["追加", "改善", "修正"] as const;
export type ChangeCategory = typeof CHANGE_CATEGORIES[number];

export interface Release {
  version: string;
  /** 公開日が未確定・未記録の場合は null。過去の公開日を推測で埋めない。 */
  date: string | null;
  title: string;
  items: { category: ChangeCategory; text: string }[];
}

// JSON の形式・並び順・パッケージとの整合性は changelog.test.ts で検証する。
export const CHANGELOG = history as Release[];
export const APP_VERSION = CHANGELOG[0]!.version;
