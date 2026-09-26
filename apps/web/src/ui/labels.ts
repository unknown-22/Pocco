import { getHobby, type ActivityType, type Stage } from "@pocco/sim";

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
  hobby: "しゅみを たのしんでいる",
  out: "おさんぽに でかけている",
  departed: "",
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
  evolve: "⭐",
  hobby_found: "🎨",
  out_start: "🚶",
  walk_end: "🎒",
  walk_event: "🌳",
  final_day: "🌙",
  quiet: "🌙",
  departed: "🕊️",
  new_egg: "🥚",
  stage_senior: "👓",
  gift: "🎁",
  first_food: "🍽️",
  clean: "🧹",
  clean_found: "✨",
  lights_on: "💡",
  lights_off: "🌙",
  wake: "⏰",
  feed_love: "😋",
  feed_normal: "🍙",
  feed_dislike: "😖",
};

export function eventIcon(e: { eventId: string; importance: string }): string {
  if (e.eventId.startsWith("hobby_") && e.eventId !== "hobby_found") {
    return getHobby(e.eventId.slice(6))?.icon ?? "🎨";
  }
  return EVENT_ICON[e.eventId] ?? (e.importance === "major" ? "⭐" : "・");
}

export const DAY_MS = 24 * 60 * 60 * 1000;

/** 何日生きたか（四捨五入。一生 14 日なら「14 日」） */
export function daysLived(bornAt: number, diedAt: number): number {
  return Math.max(1, Math.round((diedAt - bornAt) / DAY_MS));
}
