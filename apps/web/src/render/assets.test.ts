import { describe, expect, it } from "vitest";
import { FLOORS, FOODS, FURNITURE, SPECIES, TREASURES, WALLPAPERS, WEARABLES } from "@pocco/sim";
import { iconSprite } from "./icons.ts";
import { poseFrame } from "./pet.ts";
import { blink, type Sprite } from "./sprite.ts";
import * as A from "./assets/index.ts";

describe("素材のスプライト", () => {
  const all: [string, Sprite][] = [
    ["EGG", A.EGG],
    ["ZZZ", A.ZZZ],
    ["NOTE", A.NOTE],
    ["KEEPSAKE", A.KEEPSAKE],
    ["SPARKLE", A.SPARKLE],
    ["GLASSES", A.GLASSES],
    ["SNACK", A.SNACK],
    ["PAPER", A.PAPER],
    ["NOTE_SPRITE", A.NOTE_SPRITE],
    ["HEART", A.HEART],
    ["ANGER", A.ANGER],
    ...Object.entries(A.LITTER),
    ...Object.entries(A.FOOD_SPRITES),
    ...Object.entries(A.TREASURE_SPRITES),
    ...Object.entries(A.FEATURES),
    ...Object.entries(A.FURNITURE_SPRITES),
    ...Object.entries(A.HAT_SPRITES),
    ...Object.entries(A.HAND_SPRITES),
    ...Object.entries(A.ACCESSORY_SPRITES).map(([k, v]): [string, Sprite] => [k, v.sprite]),
    ...["baby", "child", "teen", "adult"].map((st): [string, Sprite] => [`body:${st}`, A.bodySprite(st)]),
  ];
  it.each(all)("%s は全行が同じ幅で、未定義の文字がない", (_, sprite) => {
    const width = sprite.rows[0]!.length;
    for (const row of sprite.rows) {
      expect(row.length).toBe(width);
      for (const ch of row) {
        if (ch !== ".") expect(sprite.colors[ch]).toBeDefined();
      }
    }
  });

  it("まばたきで目が消える", () => {
    expect(blink(A.bodySprite("baby")).rows.join("")).not.toContain("e");
  });
});

describe("bodySprite", () => {
  it("段階が進むほど大きく、左右対称の目がある", () => {
    const widths = ["baby", "child", "teen", "adult"].map((st) => A.bodySprite(st).rows[0]!.length);
    expect([...widths].sort((a, b) => a - b)).toEqual(widths);
    const body = A.bodySprite("adult");
    const eyeRow = body.rows.find((r) => r.includes("e"))!;
    expect(eyeRow.indexOf("e") + eyeRow.lastIndexOf("e")).toBe(eyeRow.length - 1);
  });
});

// ファイルを足し忘れたり、ファイル名を打ちまちがえたりしていないか
describe("素材ファイルと sim の一覧が一致する", () => {
  const same = (files: Record<string, unknown>, ids: string[]) =>
    expect(Object.keys(files).sort()).toEqual([...new Set(ids)].sort());

  it("家具", () => same(A.FURNITURE_SPRITES, FURNITURE.map((f) => f.id)));
  it("着せ替え", () => {
    const of = (slot: string) => WEARABLES.filter((w) => w.slot === slot).map((w) => w.id);
    same(A.HAT_SPRITES, of("hat"));
    same(A.CLOTHES, of("clothes"));
    same(A.ACCESSORY_SPRITES, of("accessory"));
    same(A.HAND_SPRITES, of("hand"));
  });
  it("頭の飾り", () => same(A.FEATURES, SPECIES.map((s) => s.feature).filter((f) => f !== "none")));
  it("壁紙・床の模様", () => {
    same(A.WALLPAPER_PATTERNS, WALLPAPERS.map((w) => w.pattern));
    same(A.FLOOR_PATTERNS, FLOORS.map((f) => f.pattern));
  });
  it("部屋の固定の家具", () => same(A.ROOM_PARTS, ["window", "fridge", "bed", "rug"]));
  it("散らかり", () => same(A.LITTER, ["paper", "toy", "crumb"]));
  it("食べ物", () => same(A.FOOD_SPRITES, FOODS.map((f) => f.id)));
  it("拾い物", () => same(A.TREASURE_SPRITES, TREASURES.map((t) => t.id)));
  it("持ち物はすべてドット絵のアイコンになる", () => {
    for (const f of FOODS) expect(iconSprite("food", f.id), f.id).toBeDefined();
    for (const t of TREASURES) expect(iconSprite("treasure", t.id), t.id).toBeDefined();
    for (const w of WEARABLES) expect(iconSprite("wear", w.id), w.id).toBeDefined();
    for (const f of FURNITURE) expect(iconSprite("furniture", f.id), f.id).toBeDefined();
  });
  it("種族（たまご以外はすべて形のファイルがある）", () =>
    same(A.SPECIES_ART, SPECIES.filter((s) => s.id !== "egg").map((s) => s.id)));
  it("動き", () => same(A.POSES, ["idle", "walk", "eat", "sleep", "happy", "angry", "play"]));
});

describe("種族ごとの体と動き", () => {
  const stagesOf = (stage: string) => (stage === "adult" ? ["adult", "senior", "final_day"] : [stage]);
  it.each(SPECIES.filter((s) => s.id !== "egg").map((s) => [s.id, s.stage] as const))(
    "%s はどの段階・動きのコマも、全行が同じ幅で未定義の文字がない",
    (id, speciesStage) => {
      for (const stage of stagesOf(speciesStage)) {
        for (const [pose, art] of Object.entries(A.POSES)) {
          art.frames.forEach((f, i) => {
            const sprite = A.bodySprite(stage, A.SPECIES_ART[id], { eyes: f.eyes, mouth: f.mouth, squash: f.squash });
            const width = sprite.rows[0]!.length;
            for (const row of sprite.rows) {
              expect(row.length, `${stage}/${pose}#${i}`).toBe(width);
              for (const ch of row) if (ch !== ".") expect(sprite.colors[ch]).toBeDefined();
            }
          });
        }
      }
    },
  );

  it.each(SPECIES.filter((s) => s.id !== "egg").map((s) => [s.id, s.stage] as const))(
    "%s は目が左右対称に体の中にあり、口もある",
    (id, stage) => {
      const body = A.bodySprite(stage, A.SPECIES_ART[id]);
      const eyeRow = body.rows.find((r) => r.includes("e"))!;
      expect(eyeRow, "目").toBeDefined();
      expect([...eyeRow].filter((c) => c === "e")).toHaveLength(2);
      expect(eyeRow.indexOf("e") + eyeRow.lastIndexOf("e")).toBe(eyeRow.length - 1);
      // 口（目より下にある、体の内側の線）
      const below = body.rows.slice(body.rows.indexOf(eyeRow) + 2, -2);
      expect(below.some((r) => /[BbHh]o+[BbHh]|[Bb]o[Bb]/.test(r)), "口").toBe(true);
    },
  );

  it("種族ごとに形がちがう（おとなの 12 種で、同じ形は多くても 2 つ）", () => {
    const adults = SPECIES.filter((s) => s.stage === "adult");
    const keys = adults.map((s) => A.bodySprite("adult", A.SPECIES_ART[s.id]).rows.join("/"));
    const counts = new Map<string, number>();
    for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
  });

  it("どの時刻でも（負の時刻でも）動きのコマが決まる", () => {
    for (const pose of Object.keys(A.POSES) as A.PoseName[]) {
      for (const t of [-1, -999, 0, 123, 1e9]) expect(poseFrame(pose, t), `${pose} ${t}`).toBeDefined();
    }
  });

  it("寝ているときは目を閉じ、喜ぶときは跳ねる", () => {
    const sleep = A.bodySprite("adult", {}, { eyes: "closed", squash: 1 });
    expect(sleep.rows.join("")).not.toContain("e");
    expect(sleep.rows.length).toBe(A.bodySprite("adult").rows.length - 1);
    expect(A.POSES.happy.frames.some((f) => (f.dy ?? 0) < 0)).toBe(true);
  });
});
