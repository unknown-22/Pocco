import { describe, expect, it } from "vitest";
import { loadThemeChoice, resolveTheme, saveThemeChoice } from "./theme.ts";

describe("theme", () => {
  it("「自動」は端末の設定に合わせ、ライト・ダークはそのまま", () => {
    expect(resolveTheme("auto", true)).toBe("dark");
    expect(resolveTheme("auto", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("localStorage が使えない環境でも落ちずに「自動」になる", () => {
    expect(() => saveThemeChoice("dark")).not.toThrow();
    expect(loadThemeChoice()).toBe("auto");
  });
});
