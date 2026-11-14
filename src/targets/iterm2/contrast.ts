// iTerm2のカラープリセットのコントラストの総当たり検査。キーの分類の規則はここに書く。
// 新しいキーをプリセットに足したら、ここにも規則を足す（足さないと「分類されていないキー」で検査が失敗する）。
//
// ターミナルの文字の色はエディタの背景だけを基準に計算している（src/engine/resolve.ts）。
// iTerm2には、それ以外に文字が乗る背景（カーソルのある行の帯、選択範囲）と、
// 上に乗る文字が決まっている背景（選択範囲、カーソル、検索の一致箇所）があるので、それらは下で個別に測る。
import { over, rgb255, wcag } from "../../engine/color.ts";
import { type Classification, checkMatrix, classify, type MatrixResult, type Rule } from "../../engine/contrast.ts";
import type { ItermColors } from "./theme.ts";

const fg = (min: number): Classification => ({ kind: "fg", group: "terminal", min });
const bg = (group: "base" | "editor" | "ui" | "transient"): Classification => ({ kind: "bg", group });
const skip = (reason: string): Classification => ({ kind: "skip", reason });

/** 検索の一致箇所の文字（キーはなく、iTerm2が背景から決める。下のmatchText） */
const MATCH_TEXT = "（検索の一致箇所の文字）";

/**
 * 検索の一致箇所の文字色。iTerm2は文字の色を使わず、Match Background Colorが暗ければ白、明るければ黒で描く
 * （iTermTextDrawingHelperTextColorForMatch。暗さはNSColor+iTerm.mのisDark: 0.30R + 0.59G + 0.11B < 0.5）
 */
const matchText = (bg: string): string => {
  const [r = 0, g = 0, b = 0] = rgb255(bg).map((v) => v / 255);
  return 0.3 * r + 0.59 * g + 0.11 * b < 0.5 ? "#ffffff" : "#000000";
};

/**
 * 上に乗る文字が決まっている背景。総当たりにはせず1対1で測る。
 * [文字のキー, 背景のキー, 最低ライン]
 */
const PAIRS: [string, string, number][] = [
  // 選択中の文字は、プロファイルの「Use Selected Text Color」（既定でオン）のときSelected Text Colorで描かれる
  ["Selected Text Color", "Selection Color", 4.5],
  [MATCH_TEXT, "Match Background Color", 4.5],
  // ブロックカーソルの下の文字
  ["Cursor Text Color", "Cursor Color", 4.5],
  // カーソルそのもの（文字ではないので3:1）
  ["Cursor Color", "Background Color", 3],
];
const PAIR_KEYS = new Set([...PAIRS.map(([f]) => f), ...PAIRS.map(([, b]) => b)]);

/**
 * ターミナルの文字（Foregroundや本文と同じ段階のANSIの色など）が重なって乗る背景。
 * 文字の最低ラインがthreshold以上のものだけを、min（省略時は文字の最低ライン）で測る。
 */
const OVERLAYS: { key: string; threshold: number; min?: number; note: string }[] = [
  // カーソルのある行の帯（既定ではオフ）。ターミナルの文字はエディタの背景の上でちょうど最低ラインになるように
  // 作っている（ライトでは特に）ので、帯が重なれば必ず下回る。オンにしたときだけ出る表示なので、
  // 一時的なハイライトと同じく、本文と同じ段階の文字に3:1を求める
  { key: "Cursor Guide Color", threshold: 4.5, min: 3, note: "カーソルのある行の帯" },
  // 選択範囲。「Use Selected Text Color」をオフにすると、文字は元の色のまま選択範囲の上に乗る。
  // エディタの一時的なハイライトと同じく、本文と同じ段階の文字に3:1を求める
  { key: "Selection Color", threshold: 4.5, min: 3, note: "選択範囲" },
];
const OVERLAY_KEYS = new Set(OVERLAYS.map((o) => o.key));

const RULES: Rule[] = [
  { test: (k) => PAIR_KEYS.has(k), cls: skip("1対1で測る（PAIRS）") },
  { test: (k) => OVERLAY_KEYS.has(k), cls: skip("ターミナルの文字と個別に測る（OVERLAYS）") },
  { test: /^Badge Color$/, cls: skip("バッジ（端末に半透明で重ねる飾りの文字）") },
  {
    test: /^Ansi (0|7|15) Color$/,
    cls: skip("背景に近い色であることが前提のANSIの色（black / white / bright white）"),
  },
  { test: /^Background Color$/, cls: bg("base") },
  { test: /^Ansi 8 Color$/, cls: fg(3) },
  { test: /^(Ansi \d+|Foreground|Bold|Link) Color$/, cls: fg(4.5) },
];

/** 基準に届かないものと、分類されていないキーを返す。colorsは1つのモードの色（キーの末尾に(Dark)などがないもの） */
export const checkItermColors = (colors: ItermColors): MatrixResult => {
  const editorBg = colors["Background Color"];
  if (!editorBg) return { failures: ["Background Colorがない"], unclassified: [], checked: 0 };
  const result = checkMatrix(colors, RULES, [editorBg]);

  const matchBg = colors["Match Background Color"];
  const withDerived: ItermColors = {
    ...colors,
    ...(matchBg ? { [MATCH_TEXT]: matchText(over(matchBg, editorBg)) } : {}),
  };
  for (const [f, b, min] of PAIRS) {
    const fc = withDerived[f];
    const bc = colors[b];
    if (!fc || !bc) {
      result.failures.push(`色がない: ${f} / ${b}`);
      continue;
    }
    const back = over(bc, editorBg);
    const ratio = wcag(over(fc, back), back);
    result.checked++;
    if (ratio < min) result.failures.push(`${f} ${fc} / ${b}: ${ratio.toFixed(2)}（>=${min}）`);
  }

  for (const o of OVERLAYS) {
    const oc = colors[o.key];
    if (!oc) {
      result.failures.push(`色がない: ${o.key}`);
      continue;
    }
    const back = over(oc, editorBg);
    for (const [key, color] of Object.entries(colors)) {
      const cls = classify(key, RULES);
      if (cls?.kind !== "fg" || cls.min < o.threshold) continue;
      const min = o.min ?? cls.min;
      const ratio = wcag(over(color, back), back);
      result.checked++;
      if (ratio < min) result.failures.push(`${key} ${color} / ${o.key}（${o.note}）: ${ratio.toFixed(2)}（>=${min}）`);
    }
  }
  return result;
};
