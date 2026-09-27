// 画面の配色（ライト／ダーク）。端末ごとの好みなので、サーバーには送らずこの端末に覚える。
// 「自動」は端末の設定（prefers-color-scheme）に合わせる。

export type ThemeChoice = "auto" | "light" | "dark";
export type Theme = "light" | "dark";

const KEY = "pocco.theme";
// スマホのアドレスバーなどの色（.phone の背景と同じ）
const THEME_COLOR: Record<Theme, string> = { light: "#fdf3e7", dark: "#262030" };

export function loadThemeChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark" || v === "auto") return v;
  } catch {
    // 保存できない環境（プライベートブラウズなど）では自動のまま
  }
  return "auto";
}

export function saveThemeChoice(choice: ThemeChoice): void {
  try {
    if (choice === "auto") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // 覚えられなくても、今の画面には反映する
  }
}

export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): Theme {
  if (choice === "auto") return prefersDark ? "dark" : "light";
  return choice;
}

const darkQuery = (): MediaQueryList | undefined =>
  typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : undefined;

export function applyTheme(choice: ThemeChoice): void {
  const theme = resolveTheme(choice, darkQuery()?.matches ?? false);
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
}

/** 起動時に 1 回呼ぶ。端末の設定が変わったら「自動」のときだけ追従する */
export function initTheme(): void {
  applyTheme(loadThemeChoice());
  darkQuery()?.addEventListener("change", () => applyTheme(loadThemeChoice()));
}
