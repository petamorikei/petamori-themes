// コントラストの総当たり検査の共通部分。
// テーマのすべての色のキーを「文字」「背景」「対象外」のどれかに分類し、
// 「文字の種類 × その文字が乗りうる背景の種類」の組み合わせをすべて測る。
// 分類されないキーがあれば失敗にするので、新しいキーを足しても検査から漏れない。
import { alphaOf, over, wcag } from "./color.ts";

/** 背景の種類 */
export type BgGroup =
  /** エディタの背景（ブラー版では壁紙に重ねた色） */
  | "base"
  /** エディタの背景に常に重なる色（現在行など） */
  | "editor"
  /** UIの背景（タイトルバー、パネル、ポップアップ、入力欄、hover、選択など） */
  | "ui"
  /** 一時的なハイライト（検索結果、選択範囲、差分など）。最低ラインは3:1を上限にする */
  | "transient";

/** 文字の種類 */
export type FgGroup =
  /** コードの文字（シンタックス、本文） */
  | "code"
  /** ガターの文字（行番号）。コードの部分のハイライトは重ならない */
  | "gutter"
  /** UIの文字 */
  | "ui"
  /** ターミナルの文字 */
  | "terminal";

/** 文字の種類ごとに、どの背景の種類の上に乗りうるか */
export const FG_ON: Record<FgGroup, BgGroup[]> = {
  code: ["base", "editor", "transient"],
  gutter: ["base", "editor"],
  ui: ["base", "editor", "ui"],
  terminal: ["base"],
};

/**
 * 一時的なハイライトの上での最低ライン。ハイライトの上の文字について規格の定めはないので、
 * 本文と同じ段階の文字（最低ラインが4.5:1以上の文字）だけに3:1を求める。
 * コメントなど控えめな文字は、エディタの背景の上でちょうど3:1になるように作っているので、
 * ハイライトが重なれば必ず下回る。これは検査しない。
 */
const TRANSIENT_MIN = 3;
const TRANSIENT_APPLIES_FROM = 4.5;

export type Classification =
  | { kind: "fg"; group: FgGroup; min: number }
  | { kind: "bg"; group: BgGroup }
  | { kind: "skip"; reason: string };

export interface Rule {
  /** キーに当てはまるかどうか（正規表現か関数） */
  test: RegExp | ((key: string) => boolean);
  cls: Classification;
}

/** 最初に当てはまった規則で分類する。どれにも当てはまらなければundefined */
export const classify = (key: string, rules: readonly Rule[]): Classification | undefined =>
  rules.find((r) => (typeof r.test === "function" ? r.test(key) : r.test.test(key)))?.cls;

export interface MatrixResult {
  failures: string[];
  unclassified: string[];
  /** 測った組み合わせの数 */
  checked: number;
}

/**
 * colors: キーと色（#rrggbbまたは#rrggbbaa）。bases: エディタの背景として実際に見える不透明な色。
 * 背景の色は、半透明ならbasesに重ねてから測る。文字の色も、半透明なら背景に重ねてから測る。
 */
export const checkMatrix = (colors: Record<string, string>, rules: readonly Rule[], bases: string[]): MatrixResult => {
  const fgs: { key: string; color: string; group: FgGroup; min: number }[] = [];
  // エディタの背景として実際に見える色は、キーがなくても（ブラー版で透明でも）必ず測る
  const bgs: { key: string; group: BgGroup; colors: string[] }[] = [
    { key: "（エディタの背景として見える色）", group: "base", colors: bases },
  ];
  const unclassified: string[] = [];
  for (const [key, color] of Object.entries(colors)) {
    const cls = classify(key, rules);
    if (!cls) {
      unclassified.push(key);
      continue;
    }
    if (cls.kind === "fg") fgs.push({ key, color, group: cls.group, min: cls.min });
    // 完全に透明な背景は、下の背景がそのまま見えるだけなので測らない
    else if (cls.kind === "bg" && alphaOf(color) > 0)
      bgs.push({ key, group: cls.group, colors: bases.map((b) => over(color, b)) });
  }
  const failures: string[] = [];
  let checked = 0;
  for (const fg of fgs) {
    for (const bg of bgs) {
      if (!FG_ON[fg.group].includes(bg.group)) continue;
      if (bg.group === "transient" && fg.min < TRANSIENT_APPLIES_FROM) continue;
      const min = bg.group === "transient" ? TRANSIENT_MIN : fg.min;
      const worst = Math.min(...bg.colors.map((b) => wcag(over(fg.color, b), b)));
      checked++;
      if (worst < min) failures.push(`${fg.key} ${fg.color} / ${bg.key}: ${worst.toFixed(2)}（>=${min}）`);
    }
  }
  return { failures, unclassified, checked };
};
