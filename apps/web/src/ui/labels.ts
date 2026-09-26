import type { ActivityType, Stage } from "@pocco/sim";

export const STAGE_LABEL: Record<Stage, string> = {
  egg: "たまご",
  baby: "ベビー",
  child: "こども",
  teen: "ティーン",
  adult: "おとな",
  senior: "シニア",
  final_day: "シニア",
  departed: "おもいで",
};

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  egg: "たまごが かすかに うごいている",
  idle: "のんびりしている",
  wander: "へやを うろうろしている",
  sleep: "すやすや ねている",
  nap: "うとうと ひるねちゅう",
  play: "ひとりで あそんでいる",
  window: "まどの そとを みている",
  eat: "れいぞうこを あさっている",
  tidy: "かたづけを している",
};

export const EVENT_ICON: Record<string, string> = {
  sleep: "💤",
  nap: "💤",
  sleep_start: "🛏️",
  sleep_end: "☀️",
  nap_start: "💤",
  nap_end: "🥱",
  eat: "🍙",
  play: "🎾",
  window: "🪟",
  mess: "🌀",
  tidy: "🧹",
  find: "✨",
  monologue: "💬",
  hatch: "🐣",
  rename: "✏️",
};
