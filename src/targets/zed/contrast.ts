// Zedのテーマのコントラストの総当たり検査。キーの分類の規則はここに書く。
// 新しいキーをテーマに足したら、ここにも規則を足す（足さないと「分類されていないキー」で検査が失敗する）。
import { over } from "../../engine/color.ts";
import { type Classification, checkMatrix, type MatrixResult, type Rule } from "../../engine/contrast.ts";
import type { Style, SyntaxStyle, Theme } from "./theme.ts";

const fg = (group: "code" | "gutter" | "ui" | "terminal", min: number): Classification => ({ kind: "fg", group, min });
const bg = (group: "base" | "editor" | "ui" | "transient"): Classification => ({ kind: "bg", group });
const skip = (reason: string): Classification => ({ kind: "skip", reason });

const STATUS =
  "conflict|created|deleted|error|hidden|hint|ignored|info|modified|predictive|renamed|success|unreachable|warning";

const RULES: Rule[] = [
  // ---- 対象外（文字でも、文字の下の背景でもないもの） ----
  { test: /^accents\./, cls: skip("インデントガイドなどの飾りの色") },
  { test: /^border(\.|$)/, cls: skip("枠線") },
  { test: new RegExp(`^(${STATUS})\\.border$`), cls: skip("枠線") },
  { test: /^scrollbar\./, cls: skip("スクロールバー") },
  { test: /indent_guide/, cls: skip("インデントガイド") },
  { test: /^editor\.(invisible|wrap_guide|active_wrap_guide)$/, cls: skip("不可視文字・折り返しの目安（飾り）") },
  { test: /^(pane|pane_group|panel)\.(focused_border|border)$/, cls: skip("枠線") },
  { test: /^drop_target\.background$/, cls: skip("ドラッグ中だけの表示") },
  { test: /^players\.\d+\.(cursor|background)$/, cls: skip("カーソル・アバター") },
  { test: /^(element|ghost_element)\.disabled$|^ghost_element\.background$/, cls: skip("無効な要素・透明") },
  { test: /^terminal\.ansi\.(black|white|bright_white|dim_.+)$/, cls: skip("背景に近い色であることが前提のANSIの色") },

  // ---- 背景 ----
  {
    test: /^(editor\.background|editor\.gutter\.background|terminal\.background|toolbar\.background|tab\.active_background)$/,
    cls: bg("base"),
  },
  { test: /^editor\.active_line\.background$/, cls: bg("editor") },
  {
    test: /^(background|surface\.background|elevated_surface\.background|panel\.(background|overlay_background|overlay_hover)|title_bar\.(background|inactive_background)|status_bar\.background|tab_bar\.background|tab\.inactive_background|editor\.subheader\.background|(element|ghost_element)\.(background|hover|active|selected))$/,
    cls: bg("ui"),
  },
  {
    test: new RegExp(
      `^(editor\\.highlighted_line\\.background|search\\.(match|active_match)_background|editor\\.document_highlight\\..+|players\\.\\d+\\.selection|version_control\\.(word_added|word_deleted|conflict_marker\\..+)|(${STATUS})\\.background)$`,
    ),
    cls: bg("transient"),
  },

  // ---- 文字（UI） ----
  { test: /^(text|text\.muted|text\.accent|link_text\.hover)$/, cls: fg("ui", 4.5) },
  { test: /^text\.placeholder$/, cls: fg("ui", 3) },
  { test: /^(text|icon)\.disabled$/, cls: fg("ui", 2.5) },
  { test: /^icon(\.muted|\.placeholder|\.accent)?$/, cls: fg("ui", 3) },
  {
    test: /^(conflict|created|deleted|error|hint|info|modified|renamed|success|unreachable|warning)$/,
    cls: fg("ui", 4.5),
  },
  { test: /^(hidden|ignored|predictive)$/, cls: fg("ui", 3) },
  { test: /^version_control\.(added|modified|deleted)$/, cls: fg("ui", 3) },

  // ---- 文字（コード） ----
  { test: /^editor\.foreground$/, cls: fg("code", 4.5) },
  { test: /^editor\.(active_line_number|hover_line_number)$/, cls: fg("gutter", 4.5) },
  { test: /^editor\.line_number$/, cls: fg("gutter", 3) },
  { test: /^syntax\.(comment|comment\.doc|predictive|hint)$/, cls: fg("code", 3) },
  { test: /^syntax\./, cls: fg("code", 4.5) },

  // ---- 文字（ターミナル） ----
  { test: /^terminal\.(foreground|bright_foreground)$/, cls: fg("terminal", 4.5) },
  { test: /^terminal\.(dim_foreground|ansi\.bright_black)$/, cls: fg("terminal", 3) },
  { test: /^terminal\.ansi\./, cls: fg("terminal", 4.5) },
];

/** styleを「キー → 色」に平らにする。色でない値（nullや"blurred"）は除く */
const flatten = (style: Style): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(style)) {
    if (typeof v === "string") {
      if (v.startsWith("#")) out[k] = v;
    } else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === "string") out[`${k}.${i}`] = item;
        else for (const [pk, pv] of Object.entries(item)) out[`${k}.${i}.${pk}`] = pv;
      });
    } else if (v && k === "syntax") {
      for (const [sk, sv] of Object.entries(v as Record<string, SyntaxStyle>)) out[`syntax.${sk}`] = sv.color;
    }
  }
  return out;
};

export const checkZedTheme = (theme: Theme): MatrixResult => {
  const s = theme.style;
  const colors = flatten(s);
  const background = colors.background;
  const editorBg = colors["editor.background"];
  if (!background || !editorBg)
    return { failures: ["backgroundかeditor.backgroundがない"], unclassified: [], checked: 0 };
  // ブラー版は、半透明のbackgroundを黒い壁紙と白い壁紙に重ねた色が、エディタの背景として見える
  const blurred = (s["background.appearance"] ?? "opaque") !== "opaque";
  const bases = blurred ? [over(background, "#000000"), over(background, "#ffffff")] : [editorBg];
  return checkMatrix(colors, RULES, bases);
};
