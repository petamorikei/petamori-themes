// 配色（Palette）の規則から、Zedのテーマ1つ分のstyleを組み立てる。
// 色の計算はsrc/engine/resolve.ts、どのキーにどの色を使うかはここで決める（すべてのテーマで共通）。
// UIのキーにはUIの文字の色（r.ui）、コードのキーにはコードの文字の色（r.inks）を使う。
import type { Mode, Palette } from "../../engine/palette.ts";
import { type AnsiName, type ResolveOptions, resolveColors } from "../../engine/resolve.ts";

export { gamutNotes } from "../../engine/resolve.ts";

export interface SyntaxStyle {
  color: string;
  font_style?: "italic";
  font_weight?: number;
}
export interface Player {
  cursor: string;
  background: string;
  selection: string;
}
export type Style = Record<string, string | null | string[] | Player[] | Record<string, SyntaxStyle>>;
export interface Theme {
  name: string;
  appearance: Mode;
  style: Style;
}

export type BuildOptions = ResolveOptions;

export const buildStyle = (palette: Palette, mode: Mode, options: BuildOptions = {}): Style => {
  const r = resolveColors(palette, mode, options);
  const { tint, statusBorder, editorBg } = r;
  const CLEAR = "#00000000";

  const { chrome, panel, elevated, elementBg, subheader, highlighted, hover, muted, active, border, strongLine } =
    r.surfaces;
  const { trackBorder, selectedBorder } = r.surfaces;
  // コードの文字
  const c = r.inks;
  // UIの文字
  const u = r.ui;

  const status = (name: string, color: string, borderColor: string): Style => ({
    [name]: color,
    [`${name}.background`]: tint(color, 0.1),
    [`${name}.border`]: borderColor,
  });

  const ansi = (name: AnsiName): Style => {
    const a = r.ansiColor(name);
    return {
      [`terminal.ansi.${name}`]: a.normal,
      [`terminal.ansi.bright_${name}`]: a.bright,
      [`terminal.ansi.dim_${name}`]: a.dim,
    };
  };

  const playerColors = [c.accent, c.function, c.type, c.link, c.enum, c.number, c.string, c.error];

  const s = (color: string, extra: Omit<SyntaxStyle, "color"> = {}): SyntaxStyle => ({ color, ...extra });
  const italic = { font_style: "italic" } as const;
  const bold = { font_weight: 700 } as const;

  return {
    accents: [c.accent, c.type, c.enum, c.link, c.string, c.number, c.function],

    border,
    "border.variant": hover,
    "border.focused": u.focusBorder,
    "border.selected": selectedBorder,
    "border.transparent": CLEAR,
    "border.disabled": muted,

    background: chrome,
    "surface.background": panel,
    "elevated_surface.background": elevated,
    "drop_target.background": tint(c.accent, 0.2),

    "element.background": elementBg,
    "element.hover": hover,
    "element.active": active,
    "element.selected": active,
    "element.disabled": elementBg,
    "ghost_element.background": CLEAR,
    "ghost_element.hover": hover,
    "ghost_element.active": active,
    "ghost_element.selected": active,
    "ghost_element.disabled": elementBg,

    text: u.text,
    "text.muted": u.textMuted,
    "text.placeholder": u.placeholder,
    "text.disabled": u.disabled,
    "text.accent": u.accent,
    icon: u.text,
    "icon.muted": u.textMuted,
    "icon.disabled": u.disabled,
    "icon.placeholder": u.textMuted,
    "icon.accent": u.accent,
    "link_text.hover": u.accent,

    "title_bar.background": chrome,
    "title_bar.inactive_background": panel,
    "status_bar.background": chrome,
    "toolbar.background": editorBg,
    "tab_bar.background": panel,
    "tab.inactive_background": panel,
    "tab.active_background": editorBg,
    "panel.background": panel,
    "panel.focused_border": null,
    // スティッキースクロールで固定される行（省略時にZedが作る色と同じものを明示する）
    "panel.overlay_background": panel,
    "panel.overlay_hover": hover,
    "panel.indent_guide": hover,
    "panel.indent_guide_active": strongLine,
    "panel.indent_guide_hover": u.disabled,
    "pane.focused_border": null,
    "pane_group.border": hover,

    "search.match_background": tint(c.accent, 0.25),
    "search.active_match_background": tint(c.number, 0.25),

    "scrollbar.thumb.background": tint(c.fg, 0.2),
    "scrollbar.thumb.hover_background": border,
    "scrollbar.thumb.border": hover,
    "scrollbar.track.background": CLEAR,
    "scrollbar.track.border": trackBorder,

    "editor.foreground": c.fg,
    "editor.background": editorBg,
    "editor.gutter.background": editorBg,
    "editor.subheader.background": subheader,
    "editor.active_line.background": r.activeLine,
    "editor.highlighted_line.background": highlighted,
    "editor.line_number": c.placeholder,
    "editor.active_line_number": c.activeLineNumber,
    "editor.hover_line_number": c.textMuted,
    "editor.invisible": strongLine,
    "editor.wrap_guide": tint(c.accent, 0.05),
    "editor.active_wrap_guide": tint(c.accent, 0.1),
    "editor.indent_guide": hover,
    "editor.indent_guide_active": strongLine,
    "editor.document_highlight.read_background": tint(c.accent, 0.12),
    "editor.document_highlight.write_background": tint(c.type, 0.2),
    "editor.document_highlight.bracket_background": tint(c.accent, 0.15),

    "terminal.background": editorBg,
    "terminal.foreground": r.terminalInks.fg,
    "terminal.bright_foreground": r.terminalInks.brightFg,
    "terminal.dim_foreground": r.terminalInks.dimFg,
    "terminal.ansi.black": r.ansiBW.black,
    "terminal.ansi.bright_black": r.ansiBW.brightBlack,
    "terminal.ansi.dim_black": r.ansiBW.dimBlack,
    ...ansi("red"),
    ...ansi("green"),
    ...ansi("yellow"),
    ...ansi("blue"),
    ...ansi("magenta"),
    ...ansi("cyan"),
    "terminal.ansi.white": r.ansiBW.white,
    "terminal.ansi.bright_white": r.ansiBW.brightWhite,
    "terminal.ansi.dim_white": r.ansiBW.dimWhite,

    "version_control.added": u.vcsAdded,
    "version_control.modified": u.vcsModified,
    "version_control.deleted": u.error,
    "version_control.word_added": tint(c.vcsAdded, 0.2),
    "version_control.word_deleted": tint(c.error, 0.25),
    "version_control.conflict_marker.ours": tint(c.string, 0.1),
    "version_control.conflict_marker.theirs": tint(c.enum, 0.1),

    ...status("conflict", u.conflict, statusBorder("function")),
    ...status("created", u.success, statusBorder("string")),
    ...status("deleted", u.error, statusBorder("error")),
    ...status("error", u.error, statusBorder("error")),
    ...status("hidden", u.placeholder, muted),
    ...status("hint", u.hint, statusBorder("hint")),
    ...status("ignored", u.placeholder, border),
    ...status("info", u.info, statusBorder("enum")),
    ...status("modified", u.warning, statusBorder("number")),
    ...status("predictive", u.placeholder, muted),
    ...status("renamed", u.info, statusBorder("enum")),
    ...status("success", u.success, statusBorder("string")),
    ...status("unreachable", u.textMuted, border),
    ...status("warning", u.warning, statusBorder("number")),

    players: playerColors.map((p) => ({ cursor: p, background: p, selection: tint(p, 0.24) })),

    syntax: {
      attribute: s(c.type),
      boolean: s(c.number),
      comment: s(c.comment, italic),
      "comment.doc": s(c.commentDoc, italic),
      constant: s(c.number),
      constructor: s(c.function),
      "diff.minus": s(c.error),
      "diff.plus": s(c.string),
      embedded: s(c.fg),
      emphasis: s(c.accent, italic),
      "emphasis.strong": s(c.number, bold),
      enum: s(c.enum),
      function: s(c.function),
      hint: s(c.hint),
      keyword: s(c.keyword),
      label: s(c.enum),
      link_text: s(c.enum, italic),
      link_uri: s(c.link),
      namespace: s(c.namespace),
      number: s(c.number),
      operator: s(c.operator),
      predictive: s(c.predictive, italic),
      preproc: s(c.type),
      primary: s(c.fg),
      property: s(c.property),
      punctuation: s(c.textMuted),
      "punctuation.bracket": s(c.textMuted),
      "punctuation.delimiter": s(c.textMuted),
      "punctuation.list_marker": s(c.keyword),
      "punctuation.markup": s(c.keyword),
      "punctuation.special": s(c.function),
      selector: s(c.number),
      "selector.pseudo": s(c.type),
      string: s(c.string),
      "string.escape": s(c.keyword),
      "string.regex": s(c.number),
      "string.special": s(c.number),
      "string.special.symbol": s(c.enum),
      tag: s(c.keyword),
      "text.literal": s(c.string),
      title: s(c.accent, bold),
      type: s(c.type),
      variable: s(c.fg),
      "variable.parameter": s(c.parameter),
      "variable.special": s(c.keyword, italic),
      variant: s(c.enum),
    },
  };
};
