// 種族（仕様書 7.1）。段階が変わるとき、性格がいちばん近い種族に進化する。
// 見た目は仮素材（D13）: 体の色と頭の飾りで区別する。

import type { Personality, Stage } from "./types.ts";

export type Feature =
  | "none"
  | "sprout"
  | "ears"
  | "bunny"
  | "antenna"
  | "horn"
  | "crown"
  | "nightcap"
  | "tuft"
  | "bow"
  | "leaf"
  | "star";

export interface Species {
  id: string;
  name: string;
  stage: Stage;
  /** この方向の性格ほど選ばれやすい。空ならどの軸も目立たないときの受け皿 */
  target: Partial<Personality>;
  colors: { body: string; shade: string; line: string; light: string; cheek: string; feature: string };
  feature: Feature;
  description: string;
}

const c = (body: string, shade: string, line: string, light: string, feature: string, cheek = "#ff8fa3") => ({
  body, shade, line, light, cheek, feature,
});

export const SPECIES: Species[] = [
  { id: "egg", name: "たまご", stage: "egg", target: {}, colors: c("#fff6e6", "#ecd6b5", "#c9a579", "#fff6e6", "#7fd1b9"), feature: "none", description: "なにが生まれるかな" },
  { id: "pocco", name: "ぽっこ", stage: "baby", target: {}, colors: c("#ffd166", "#f2a93f", "#c4722a", "#fff3c4", "#ffd166"), feature: "none", description: "生まれたばかり" },

  // こども
  { id: "c_sprout", name: "めばえっこ", stage: "child", target: {}, colors: c("#ffd98a", "#f0b25a", "#c27f33", "#fff3cf", "#7fcf8f"), feature: "sprout", description: "すくすく育ちちゅう" },
  { id: "c_hop", name: "ぴょんこ", stage: "child", target: { energy: 1 }, colors: c("#ffb38a", "#f08a5d", "#bd5d34", "#ffe0cc", "#ffb38a"), feature: "ears", description: "じっとしていられない" },
  { id: "c_fluff", name: "ふわこ", stage: "child", target: { energy: -1, attachment: 0.5 }, colors: c("#f7c6e0", "#e39bc3", "#b46b94", "#fde8f3", "#f7c6e0"), feature: "tuft", description: "のんびり、ふわふわ" },
  { id: "c_peek", name: "きょろこ", stage: "child", target: { curiosity: 1 }, colors: c("#a8e0d2", "#79c2b0", "#4b8f7e", "#dcf4ee", "#ffd166"), feature: "antenna", description: "なんでも気になる" },

  // ティーン
  { id: "t_leaf", name: "はっぱっこ", stage: "teen", target: {}, colors: c("#c8e6a0", "#9fcb73", "#6a9444", "#eaf6d9", "#7fcf8f"), feature: "leaf", description: "おだやかな年ごろ" },
  { id: "t_runner", name: "かけっこ", stage: "teen", target: { energy: 1 }, colors: c("#ff9f80", "#ec7654", "#b64f31", "#ffd6c7", "#ff9f80"), feature: "ears", description: "走るのが大好き" },
  { id: "t_neat", name: "きちんこ", stage: "teen", target: { tidiness: 1 }, colors: c("#b9d4ff", "#8fb2ec", "#5d7fba", "#e3eeff", "#ff8fa3"), feature: "bow", description: "身だしなみが気になる" },
  { id: "t_night", name: "よいっこ", stage: "teen", target: { chronotype: 1 }, colors: c("#b8a8e8", "#9582d1", "#65549e", "#e2dafa", "#ffe28a"), feature: "nightcap", description: "夜になると元気" },
  { id: "t_munch", name: "もぐっこ", stage: "teen", target: { appetite: 1 }, colors: c("#ffcf70", "#f0a840", "#b87424", "#ffeec4", "#ffcf70"), feature: "tuft", description: "いつも何か食べている" },

  // おとな（12 種）
  { id: "a_sunny", name: "ひだまりポッコ", stage: "adult", target: {}, colors: c("#ffd166", "#f2a93f", "#c4722a", "#fff3c4", "#ff9a6b"), feature: "sprout", description: "バランスよく育った、おだやかな子" },
  { id: "a_fridge", name: "冷蔵庫の主", stage: "adult", target: { appetite: 1, attachment: -0.7 }, colors: c("#cfe6ef", "#a3c9d8", "#6b95a8", "#eef7fb", "#ffd166"), feature: "crown", description: "冷蔵庫の中身をすべて把握している" },
  { id: "a_junk", name: "ゴミ山の王", stage: "adult", target: { tidiness: -1, curiosity: 0.6 }, colors: c("#c9b28f", "#a88f6a", "#76603f", "#e6d8c0", "#ffcf4d"), feature: "crown", description: "散らかった部屋こそ王国" },
  { id: "a_poet", name: "夜ふかし詩人", stage: "adult", target: { chronotype: 1, energy: -0.5 }, colors: c("#9d8fe0", "#7c6cc6", "#54479a", "#d3ccf7", "#ffe28a"), feature: "nightcap", description: "星を見ながら詩を考える" },
  { id: "a_dash", name: "はしりや", stage: "adult", target: { energy: 1 }, colors: c("#ff8f73", "#e8694c", "#ac4228", "#ffd0c4", "#ffe28a"), feature: "ears", description: "部屋を一周 3 秒" },
  { id: "a_prim", name: "おすまし", stage: "adult", target: { tidiness: 1, attachment: -0.5 }, colors: c("#b3ccff", "#8aa9ec", "#5a77b6", "#e0eaff", "#ff8fa3"), feature: "bow", description: "いつもきちんとしている" },
  { id: "a_cuddle", name: "あまえんぼ", stage: "adult", target: { attachment: 1 }, colors: c("#ffb8d1", "#f28fb2", "#c25d84", "#ffe3ee", "#ffb8d1"), feature: "bunny", description: "そばにいてほしい" },
  { id: "a_explorer", name: "たんけんか", stage: "adult", target: { curiosity: 1, energy: 0.5 }, colors: c("#8fd8b8", "#62bb96", "#3a8666", "#d2f2e3", "#ffd166"), feature: "antenna", description: "まだ見ぬ場所へ" },
  { id: "a_sleepy", name: "ねぼすけ", stage: "adult", target: { energy: -1, appetite: 0.4 }, colors: c("#e8d7b8", "#cfb991", "#9a8362", "#f7efe0", "#b8a8e8"), feature: "nightcap", description: "一日の半分は寝ている" },
  { id: "a_glutton", name: "くいしんぼ大将", stage: "adult", target: { appetite: 1, energy: 0.5 }, colors: c("#ffc15e", "#ef9b32", "#b36a17", "#ffe7b8", "#ff6b6b"), feature: "horn", description: "おかわりの声が大きい" },
  { id: "a_loner", name: "ひとりずき", stage: "adult", target: { attachment: -1 }, colors: c("#a9b8c9", "#8497ad", "#586b80", "#dbe3ec", "#7fd1b9"), feature: "leaf", description: "ひとりの時間を大切にする" },
  { id: "a_dawn", name: "あさやけ", stage: "adult", target: { chronotype: -1, tidiness: 0.4 }, colors: c("#ffc2a1", "#f59f78", "#c06d48", "#ffe6d8", "#ffe28a"), feature: "star", description: "朝日と一緒に起きる" },
];

const byId = new Map(SPECIES.map((s) => [s.id, s]));
export const getSpecies = (id: string) => byId.get(id) ?? byId.get("pocco")!;

/** どの軸も目立たないとき（この値未満）は受け皿の種族になる */
const DISTINCT_THRESHOLD = 15;

/** 性格にいちばん合う、その段階の種族を選ぶ */
export function chooseSpecies(stage: Stage, p: Personality): Species {
  const candidates = SPECIES.filter((s) => s.stage === stage);
  if (candidates.length === 0) return getSpecies("pocco");
  let best: Species | undefined;
  let bestScore = -Infinity;
  for (const s of candidates) {
    const axes = Object.entries(s.target) as [keyof Personality, number][];
    if (axes.length === 0) continue;
    const norm = Math.sqrt(axes.reduce((sum, [, w]) => sum + w * w, 0));
    const score = axes.reduce((sum, [axis, w]) => sum + w * p[axis], 0) / norm;
    if (score > bestScore) {
      best = s;
      bestScore = score;
    }
  }
  if (!best || bestScore < DISTINCT_THRESHOLD) return candidates.find((s) => Object.keys(s.target).length === 0) ?? candidates[0]!;
  return best;
}

/** シニアは元の種族のまま、見た目だけ変わる（白っぽくなり眼鏡をかける） */
export function speciesForStage(stage: Stage, current: string, p: Personality): string {
  if (stage === "senior" || stage === "final_day" || stage === "departed") return current;
  return chooseSpecies(stage, p).id;
}
