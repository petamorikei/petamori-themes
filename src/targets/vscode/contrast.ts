// VS Codeのテーマのコントラストの総当たり検査。キーの分類の規則はここに書く。
// 新しいキーをテーマに足したら、ここにも規則を足す（足さないと「分類されていないキー」で検査が失敗する）。
import { over, wcag } from "../../engine/color.ts";
import { type Classification, checkMatrix, type MatrixResult, type Rule } from "../../engine/contrast.ts";
import type { VscodeTheme } from "./theme.ts";

const fg = (group: "code" | "gutter" | "ui" | "terminal", min: number): Classification => ({ kind: "fg", group, min });
const bg = (group: "base" | "editor" | "ui" | "transient"): Classification => ({ kind: "bg", group });
const skip = (reason: string): Classification => ({ kind: "skip", reason });

/**
 * アクセントの色で塗りつぶす背景と、その上に乗る文字。上に乗る文字が決まっているので、総当たりにはせず1対1で測る。
 * [文字のキー, 背景のキー, 最低ライン]
 */
const FILLED_PAIRS: [string, string, number][] = [
  ["button.foreground", "button.background", 4.5],
  ["button.foreground", "button.hoverBackground", 4.5],
  ["badge.foreground", "badge.background", 4.5],
  ["activityBarBadge.foreground", "activityBarBadge.background", 4.5],
  ["statusBar.debuggingForeground", "statusBar.debuggingBackground", 4.5],
  ["statusBarItem.remoteForeground", "statusBarItem.remoteBackground", 4.5],
  ["statusBarItem.errorForeground", "statusBarItem.errorBackground", 4.5],
  ["editorInlayHint.foreground", "editorInlayHint.background", 3],
  // 検索欄などの切り替えボタンがオンのときの背景。上に乗るのはアイコンだけ
  ["inputOption.activeForeground", "inputOption.activeBackground", 3],
];
const FILLED_KEYS = new Set([...FILLED_PAIRS.map(([f]) => f), ...FILLED_PAIRS.map(([, b]) => b)]);

const RULES: Rule[] = [
  // ---- 1対1で測るもの ----
  { test: (k) => FILLED_KEYS.has(k), cls: skip("1対1で測る（FILLED_PAIRS）") },

  // ---- 対象外（文字でも、文字の下の背景でもないもの） ----
  { test: /[Bb]order$|[Bb]order\d*$|Outline$|^focusBorder$|^sash\./, cls: skip("枠線") },
  { test: /[Ss]hadow$/, cls: skip("影") },
  { test: /^scrollbarSlider\./, cls: skip("スクロールバー") },
  { test: /^(editorCursor|terminalCursor)\./, cls: skip("カーソル") },
  { test: /^(editorWhitespace|editorIndentGuide|editorRuler)\.|Stroke$/, cls: skip("不可視文字・ガイド（飾り）") },
  { test: /^(editorOverviewRuler|minimap|minimapGutter)\./, cls: skip("概要ルーラー・ミニマップ") },
  { test: /^editorGutter\.(added|modified|deleted)Background$/, cls: skip("ガターの印") },
  { test: /^charts\./, cls: skip("グラフの色") },
  { test: /^progressBar\.background$/, cls: skip("進捗バー") },
  {
    test: /^diffEditor\.diagonalFill$|^textSeparator\.foreground$|^menu\.separatorBackground$|^button\.separator$/,
    cls: skip("区切り線"),
  },
  { test: /^settings\.modifiedItemIndicator$/, cls: skip("変更の印") },
  { test: /^(editorGroup|sideBar|list)\.dropBackground$/, cls: skip("ドラッグ中だけの表示") },
  { test: /^terminal\.ansi(Black|White|BrightWhite)$/, cls: skip("背景に近い色であることが前提のANSIの色") },

  // ---- 背景 ----
  {
    test: /^(editor\.background|editorGutter\.background|terminal\.background|panel\.background|breadcrumb\.background|editorGroupHeader\.noTabsBackground|tab\.(activeBackground|unfocusedActiveBackground)|editorStickyScroll\.background)$/,
    cls: bg("base"),
  },
  {
    test: /^(editor\.lineHighlightBackground|editor\.foldBackground|editorStickyScrollHover\.background|peekViewEditor\.background|peekViewEditorGutter\.background)$/,
    cls: bg("editor"),
  },
  {
    test: /^(editor\.(selection|inactiveSelection|selectionHighlight|wordHighlight|wordHighlightStrong|wordHighlightText|findMatch|findMatchHighlight|findRangeHighlight|rangeHighlight|hoverHighlight)Background|editorBracketMatch\.background|diffEditor\..+Background|merge\..+Background|peekView(Editor|Result)\.matchHighlightBackground|terminal\.(inactiveSelection|selection)Background|selection\.background)$/,
    cls: bg("transient"),
  },
  { test: /[Bb]ackground$/, cls: bg("ui") },

  // ---- 文字（コード） ----
  { test: /^(editor\.foreground|editorLink\.activeForeground|editorBracketHighlight\..+)$/, cls: fg("code", 4.5) },

  // ---- 文字（ガター。コードの部分のハイライトは重ならない） ----
  { test: /^editorLineNumber\.activeForeground$/, cls: fg("gutter", 4.5) },
  { test: /^editorLineNumber\.dimmedForeground$/, cls: fg("gutter", 2.5) },
  {
    test: /^(editorLineNumber\.foreground|editorCodeLens\.foreground|editorGhostText\.foreground|editor(Error|Warning|Info|Hint)\.foreground|editorGutter\.foldingControlForeground)$/,
    cls: fg("gutter", 3),
  },

  // ---- 文字（ターミナル） ----
  { test: /^terminal\.foreground$/, cls: fg("terminal", 4.5) },
  { test: /^terminal\.ansiBrightBlack$/, cls: fg("terminal", 3) },
  { test: /^terminal\.ansi/, cls: fg("terminal", 4.5) },

  // ---- 文字（UI） ----
  { test: /^disabledForeground$/, cls: fg("ui", 2.5) },
  { test: /^testing\.icon/, cls: fg("ui", 3) },
  {
    test: /(inactive|Inactive|placeholder|Placeholder|deemphasized|unfocusedInactive|Icon\.foreground|IconForeground|^icon\.foreground|ignoredResource)/,
    cls: fg("ui", 3),
  },
  { test: /[Ff]oreground$/, cls: fg("ui", 4.5) },
];

/** 基準に届かないものと、分類されていないキーを返す */
export const checkVscodeTheme = (t: VscodeTheme): MatrixResult => {
  const c = t.colors;
  const editorBg = c["editor.background"];
  if (!editorBg) return { failures: ["editor.backgroundがない"], unclassified: [], checked: 0 };

  // UIの色と、コードの文字（TextMateのトークンとセマンティックトークン）をまとめて総当たりにかける
  const colors: Record<string, string> = { ...c };
  const rules: Rule[] = [
    { test: /^(token|semantic)\..*comment/, cls: fg("code", 3) },
    { test: /^(token|semantic)\./, cls: fg("code", 4.5) },
    ...RULES,
  ];
  for (const rule of t.tokenColors) {
    if (rule.settings.foreground)
      colors[`token.${(rule.name ?? rule.scope[0] ?? "").toLowerCase()}`] = rule.settings.foreground;
  }
  for (const [k, v] of Object.entries(t.semanticTokenColors)) {
    const color = typeof v === "string" ? v : v.foreground;
    if (color) colors[`semantic.${k}`] = color;
  }
  const result = checkMatrix(colors, rules, [editorBg]);

  // アクセントの色で塗りつぶす背景は1対1で測る
  for (const [f, b, min] of FILLED_PAIRS) {
    const fc = c[f];
    const bc = c[b];
    if (!fc || !bc) {
      result.failures.push(`色がない: ${f} / ${b}`);
      continue;
    }
    const back = over(bc, editorBg);
    const ratio = wcag(over(fc, back), back);
    result.checked++;
    if (ratio < min) result.failures.push(`${f} ${fc} / ${b}: ${ratio.toFixed(2)}（>=${min}）`);
  }
  return result;
};
