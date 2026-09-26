// 日記の文章テンプレート（仕様書 9.3）。性格や状況で言い回しを変える。

import type { PetState } from "./types.ts";
import type { Rng } from "./rng.ts";

export interface TextContext {
  state: PetState;
  night: boolean;
  lonely: boolean;
  spot?: string;
  duration?: string;
}

type Variant = { when?: (c: TextContext) => boolean; texts: string[] };

const T: Record<string, Variant[]> = {
  sleep_start: [
    { when: (c) => c.state.personality.chronotype > 40, texts: ["夜ふかしして、やっとベッドに入った。"] },
    { texts: ["ベッドに入った。", "あくびをして、ベッドにもぐりこんだ。", "ベッドで丸くなった。おやすみ。"] },
  ],
  sleep_end: [
    { texts: ["目をさました。（{duration}眠っていた）", "のびをして起きた。（{duration}眠っていた）", "ベッドから起き出した。（{duration}眠っていた）"] },
  ],
  nap_start: [
    { texts: ["{spot}でうとうとしはじめた。", "{spot}で寝落ちした。", "{spot}で昼寝をはじめた。"] },
  ],
  nap_end: [
    { texts: ["昼寝から起きた。（{duration}）", "むくっと起き上がった。（{duration}昼寝していた）"] },
  ],
  play: [
    { when: (c) => c.state.personality.energy < -30, texts: ["ゆっくり積み木を積みはじめた。", "ラグの上でごろごろ転がりはじめた。"] },
    { when: (c) => c.state.personality.energy > 30, texts: ["部屋じゅうを全力で走り回りはじめた。", "ベッドの上でジャンプしはじめた。"] },
    { texts: ["ひとりでボール遊びをはじめた。", "しっぽを追いかけてぐるぐる回りはじめた。", "クッションと相撲をとりはじめた。"] },
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
  return text
    .replace("{spot}", SPOT_LABEL[ctx.spot ?? "floor"] ?? "床の上")
    .replace("{duration}", ctx.duration ?? "");
}
