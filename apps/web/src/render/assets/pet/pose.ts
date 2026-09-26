// 動き（poses/<名前>.ts）の型。コマを順にくり返す。

import type { Eyes, Mouth } from "./body.ts";

export type PoseName = "idle" | "walk" | "eat" | "sleep" | "happy" | "angry" | "play";

export interface PoseFrame {
  /** 上下・左右のずれ（跳ねる・ふるえる） */
  dy?: number;
  dx?: number;
  eyes?: Eyes;
  mouth?: Mouth;
  /** 体の下のほうを何行つぶすか */
  squash?: number;
  /** 歩くときに見える足 */
  foot?: "left" | "right";
  /** 頭の横に出すしるし（effects/ のファイル名） */
  mark?: "heart" | "anger";
}

export interface PoseArt {
  /** 1 コマの長さ（ミリ秒） */
  frameMs: number;
  frames: PoseFrame[];
  /** ときどきまばたきする */
  blink?: boolean;
}
