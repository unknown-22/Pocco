// 日記の文章テンプレート（仕様書 9.3）。性格や状況で言い回しを変える。

import type { PetState } from "./types.ts";
import type { Rng } from "./rng.ts";

export interface TextContext {
  state: PetState;
  night: boolean;
  lonely: boolean;
  spot?: string;
}

type Variant = { when?: (c: TextContext) => boolean; texts: string[] };

const T: Record<string, Variant[]> = {
  sleep: [
    { when: (c) => c.state.personality.chronotype > 40, texts: ["夜ふかしのあと、やっと眠った。"] },
    { texts: ["ぐっすり眠っていた。", "すやすや眠った。", "ベッドで丸くなって眠っていた。"] },
  ],
  nap: [
    { texts: ["{spot}で昼寝をしていた。", "{spot}でうとうとしていた。", "{spot}で寝落ちしていた。"] },
  ],
  play: [
    { when: (c) => c.state.personality.energy < -30, texts: ["ゆっくり積み木を積んでいた。", "ラグの上でごろごろ転がっていた。"] },
    { when: (c) => c.state.personality.energy > 30, texts: ["部屋じゅうを全力で走り回っていた。", "ベッドの上で何度もジャンプしていた。"] },
    { texts: ["ひとりでボール遊びをしていた。", "しっぽを追いかけてぐるぐる回っていた。", "クッションと相撲をとっていた。"] },
  ],
  window: [
    { when: (c) => c.lonely && c.state.personality.attachment > 10, texts: ["窓の外をずっと見ていた。帰りを待っていたのかも。", "窓に顔をくっつけて、外をじっと見ていた。"] },
    { when: (c) => c.lonely && c.state.personality.attachment < -10, texts: ["窓の外を見ていたけど、平気そうだった。", "窓の外を見ていた。ひとりでも平気らしい。", "窓の外をちらっと見て、すぐ遊びに戻った。"] },
    { when: (c) => c.night, texts: ["窓から星を数えていた。", "窓から夜の街をながめていた。"] },
    { texts: ["窓の外をぼんやり眺めていた。", "窓から雲の形を観察していた。"] },
  ],
  eat: [
    { when: (c) => c.state.personality.tidiness > 30, texts: ["冷蔵庫を開けて、ちゃんと閉めた。"] },
    { when: (c) => c.state.personality.tidiness < -30, texts: ["冷蔵庫を開けっぱなしにしていた。"] },
    { texts: ["冷蔵庫を勝手に開けた。", "冷蔵庫をあさって、何かを食べた。", "冷蔵庫の前でこっそりつまみ食いした。"] },
  ],
  mess: [
    { texts: ["クッションを床に放り投げた。", "おもちゃを部屋じゅうに広げた。", "紙をびりびりにした。", "ラグをくしゃくしゃにした。"] },
  ],
  tidy: [
    { texts: ["散らかったおもちゃを片付けていた。", "部屋のすみを掃除していた。"] },
  ],
  find: [
    { texts: ["ベッドの下からコインを見つけた。", "ラグの下からボタンを見つけた。", "冷蔵庫の裏からビー玉を見つけた。", "クッションのすきまから鍵のようなものを見つけた。"] },
  ],
  monologue: [
    { when: (c) => c.state.needs.hunger > 50, texts: ["「おなか すいたなあ」とひとりごと。"] },
    { when: (c) => c.lonely, texts: ["「まだかなあ」とつぶやいていた。"] },
    { texts: ["鼻歌をうたっていた。", "「ふふっ」とひとりで笑っていた。", "「きょうは なんようび？」とつぶやいていた。"] },
  ],
  hatch: [{ texts: ["たまごがかえった！"] }],
  stage_child: [{ texts: ["こどもになった！"] }],
  stage_teen: [{ texts: ["ティーンになった！"] }],
  stage_adult: [{ texts: ["おとなになった！"] }],
  stage_senior: [{ texts: ["シニアになった。"] }],
};

const SPOT_LABEL: Record<string, string> = {
  rug: "ラグの上",
  floor: "床の上",
  bed: "ベッドの端",
  window: "窓ぎわ",
  fridge: "冷蔵庫の前",
};

export function pickText(eventId: string, ctx: TextContext, rng: Rng): string {
  const variants = T[eventId];
  if (!variants) return eventId;
  const variant = variants.find((v) => !v.when || v.when(ctx)) ?? variants[variants.length - 1]!;
  const text = variant.texts[Math.floor(rng() * variant.texts.length)]!;
  return text.replace("{spot}", SPOT_LABEL[ctx.spot ?? "floor"] ?? "床の上");
}
