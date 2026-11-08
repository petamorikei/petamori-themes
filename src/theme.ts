// palette.ts の規則から、Zed のテーマ1つ分の style を組み立てる
import { hexOklch, oklchHex, solveInk, withAlpha } from "./color.ts";
import { type Mode, type Palette, palette, type Role, type Tier } from "./palette.ts";

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

export interface BuildOptions {
  /** WCAG 2 の最低ラインを確かめる背景。省略時はエディタの背景だけ（ブラー版では壁紙に重ねた色を渡す） */
  floorBgs?: readonly string[];
  /** 使う配色。省略時は palette.ts の palette（比較用テーマでは一部を書き換えたものを渡す） */
  palette?: Palette;
}

/** 生成した色の彩度が、指定より大きく下がったもの（sRGB に収まらなかったもの）を記録する */
export const gamutNotes: string[] = [];

export const buildStyle = (mode: Mode, options: BuildOptions = {}): Style => {
  const { config, roles, tiers, surface, terminal } = options.palette ?? palette;
  const dark = mode === "dark";
  const editorL = surface.editorL[mode];
  const editorBg = oklchHex(editorL, surface.chroma, surface.hue);
  const floorBgs = options.floorBgs ?? [editorBg];

  // ---- 文字の色 ----
  const cache = new Map<string, string>();
  /** scale: 段階の目標値にかける倍率（ターミナルの bright / dim 用）。floor: WCAG 2 の最低ラインを段階の値から変える */
  const ink = (role: Role, tier: Tier, opts: { scale?: number; floor?: number } = {}): string => {
    const scale = opts.scale ?? 1;
    const floor = opts.floor ?? tiers[tier].floor;
    const key = `${role}/${tier}/${scale}/${floor}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const { h, c } = roles[role];
    const chroma = dark ? c : Math.min(c * config.lightChromaScale, config.lightChromaMax);
    const hex = solveInk({
      hue: h,
      chroma,
      target: tiers[tier][config.metric] * scale,
      metric: config.metric,
      bg: editorBg,
      direction: dark ? "up" : "down",
      floor,
      floorBgs,
    });
    cache.set(key, hex);
    const got = hexOklch(hex).c;
    if (chroma - got > 0.005) {
      gamutNotes.push(
        `${mode} ${role}/${tier}: 彩度 ${chroma.toFixed(3)} → ${got.toFixed(3)}（sRGB に収まらないため）`,
      );
    }
    return hex;
  };

  // ---- 背景と枠線 ----
  /** abs: 両テーマで同じ向きにずらす / fg: 文字に近づく向きにずらす */
  const surf = (offset: number, kind: "abs" | "fg", hue: number = surface.hue, chroma?: number): string => {
    const l = editorL + (kind === "abs" ? offset : dark ? offset : -offset);
    const c = chroma ?? surface.chroma + (kind === "fg" ? Math.abs(offset) * surface.chromaPerStep : 0);
    return oklchHex(l, c, hue);
  };

  // ---- 半透明 ----
  const scale = dark ? 1 : config.lightOverlayScale;
  const tint = (hex: string, alpha: number): string => withAlpha(hex, alpha * scale);
  const CLEAR = "#00000000";

  // 背景の段差
  const chrome = surf(-0.05, "abs"); // タイトルバー、ステータスバー、ウィンドウ全体
  const panel = surf(-0.03, "abs"); // パネル、タブバー
  const elevated = surf(0.02, "abs"); // ポップアップ、コマンドパレット
  const elementBg = surf(0.03, "fg");
  const subheader = surf(0.025, "fg");
  const highlighted = surf(0.05, "fg");
  const hover = surf(0.065, "fg");
  const muted = surf(0.08, "fg"); // 無効な枠線
  const active = surf(0.105, "fg");
  const border = surf(0.125, "fg");
  const strongLine = surf(0.15, "fg"); // 不可視文字、アクティブなインデントガイド
  const trackBorder = surf(0.02, "fg");

  // 文字
  const text = ink("neutral", "strong");
  const fg = ink("neutral", "body");
  const textMuted = ink("neutral", "muted");
  const placeholder = ink("neutral", "faint");
  const disabled = ink("neutral", "disabled");
  const accent = ink("rose", "accent");
  const keyword = ink("roseVivid", "accent");
  const fn = ink("peach", "primary");
  const type = ink("lavender", "accent");
  const string = ink("sage", "primary");
  const number = ink("apricot", "primary");
  const enumC = ink("blue", "primary");
  const teal = ink("teal", "primary");
  const error = ink("coral", "muted");
  const hint = ink("violet", "muted");
  const comment = ink("neutral", "faint");
  const predictive = ink("neutral", "faint");
  const vcsAdded = ink("vcsGreen", "accent", { floor: 4.5 });

  // 状態色の枠線: 役割の色相で、背景から border と同じだけ離す。グレー系の状態はふつうの枠線を使う
  const statusBorder = (role: Role): string => surf(0.125, "fg", roles[role].h, surface.statusBorderChroma);

  const status = (name: string, color: string, borderColor: string): Style => ({
    [name]: color,
    [`${name}.background`]: tint(color, 0.1),
    [`${name}.border`]: borderColor,
  });

  // ANSI の black / white は「black は暗い、white は明るい」の意味どおりにする
  const ansiBW = dark
    ? {
        black: hover,
        bright_black: ink("neutral", "faint"),
        dim_black: elevated,
        white: fg,
        bright_white: text,
        dim_white: ink("neutral", "subtle", { floor: 0 }),
      }
    : {
        black: text,
        bright_black: ink("neutral", "faint"),
        dim_black: textMuted,
        white: border,
        bright_white: elevated,
        dim_white: disabled,
      };

  // ANSI の色: 通常はシンタックスと同じ段階。bright と dim は、その目標値に倍率をかける
  // （Dawn では bright のほうが背景から遠い＝暗くなる）
  const ansi = (name: string, role: Role, tier: Tier): Style => ({
    [`terminal.ansi.${name}`]: ink(role, tier),
    [`terminal.ansi.bright_${name}`]: ink(role, tier, { scale: terminal.brightScale }),
    [`terminal.ansi.dim_${name}`]: ink(role, tier, { scale: terminal.dimScale, floor: 0 }),
  });

  const playerColors = [accent, fn, type, teal, enumC, number, string, error];

  const s = (color: string, extra: Omit<SyntaxStyle, "color"> = {}): SyntaxStyle => ({ color, ...extra });
  const italic = { font_style: "italic" } as const;
  const bold = { font_weight: 700 } as const;

  return {
    accents: [accent, type, enumC, teal, string, number, fn],

    border,
    "border.variant": hover,
    "border.focused": ink("rose", "muted", { floor: 3 }),
    "border.selected": surf(0.15, "fg", roles.rose.h, 0.05),
    "border.transparent": CLEAR,
    "border.disabled": muted,

    background: chrome,
    "surface.background": panel,
    "elevated_surface.background": elevated,
    "drop_target.background": tint(accent, 0.2),

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

    text,
    "text.muted": textMuted,
    "text.placeholder": placeholder,
    "text.disabled": disabled,
    "text.accent": accent,
    icon: text,
    "icon.muted": textMuted,
    "icon.disabled": disabled,
    "icon.placeholder": textMuted,
    "icon.accent": accent,
    "link_text.hover": accent,

    "title_bar.background": chrome,
    "title_bar.inactive_background": panel,
    "status_bar.background": chrome,
    "toolbar.background": editorBg,
    "tab_bar.background": panel,
    "tab.inactive_background": panel,
    "tab.active_background": editorBg,
    "panel.background": panel,
    "panel.focused_border": null,
    // スティッキースクロールで固定される行（省略時に Zed が作る色と同じものを明示する）
    "panel.overlay_background": panel,
    "panel.overlay_hover": hover,
    "panel.indent_guide": hover,
    "panel.indent_guide_active": strongLine,
    "panel.indent_guide_hover": disabled,
    "pane.focused_border": null,
    "pane_group.border": hover,

    "search.match_background": tint(accent, 0.25),
    "search.active_match_background": tint(number, 0.35),

    "scrollbar.thumb.background": tint(fg, 0.2),
    "scrollbar.thumb.hover_background": border,
    "scrollbar.thumb.border": hover,
    "scrollbar.track.background": CLEAR,
    "scrollbar.track.border": trackBorder,

    "editor.foreground": fg,
    "editor.background": editorBg,
    "editor.gutter.background": editorBg,
    "editor.subheader.background": subheader,
    "editor.active_line.background": tint(hover, 0.6),
    "editor.highlighted_line.background": highlighted,
    "editor.line_number": ink("neutral", "faint"),
    "editor.active_line_number": ink("rosePale", "primary"),
    "editor.hover_line_number": textMuted,
    "editor.invisible": strongLine,
    "editor.wrap_guide": tint(accent, 0.05),
    "editor.active_wrap_guide": tint(accent, 0.1),
    "editor.indent_guide": hover,
    "editor.indent_guide_active": strongLine,
    "editor.document_highlight.read_background": tint(accent, 0.12),
    "editor.document_highlight.write_background": tint(type, 0.2),
    "editor.document_highlight.bracket_background": tint(accent, 0.15),

    "terminal.background": editorBg,
    "terminal.foreground": fg,
    "terminal.bright_foreground": text,
    "terminal.dim_foreground": placeholder,
    "terminal.ansi.black": ansiBW.black,
    "terminal.ansi.bright_black": ansiBW.bright_black,
    "terminal.ansi.dim_black": ansiBW.dim_black,
    ...ansi("red", "coral", "muted"),
    ...ansi("green", "sage", "primary"),
    ...ansi("yellow", "apricot", "primary"),
    ...ansi("blue", "blue", "primary"),
    ...ansi("magenta", "rose", "accent"),
    ...ansi("cyan", "teal", "primary"),
    "terminal.ansi.white": ansiBW.white,
    "terminal.ansi.bright_white": ansiBW.bright_white,
    "terminal.ansi.dim_white": ansiBW.dim_white,

    // ガターの印は面積が小さいので彩度を残したい。accent の段階にして、Dawn で暗くなりすぎないよう floor は 4.5 にする
    "version_control.added": vcsAdded,
    "version_control.modified": ink("vcsAmber", "accent", { floor: 4.5 }),
    "version_control.deleted": error,
    "version_control.word_added": tint(vcsAdded, 0.2),
    "version_control.word_deleted": tint(error, 0.25),
    "version_control.conflict_marker.ours": tint(string, 0.1),
    "version_control.conflict_marker.theirs": tint(enumC, 0.1),

    ...status("conflict", fn, statusBorder("peach")),
    ...status("created", string, statusBorder("sage")),
    ...status("deleted", error, statusBorder("coral")),
    ...status("error", error, statusBorder("coral")),
    ...status("hidden", placeholder, muted),
    ...status("hint", hint, statusBorder("violet")),
    ...status("ignored", placeholder, border),
    ...status("info", enumC, statusBorder("blue")),
    ...status("modified", number, statusBorder("apricot")),
    ...status("predictive", predictive, muted),
    ...status("renamed", enumC, statusBorder("blue")),
    ...status("success", string, statusBorder("sage")),
    ...status("unreachable", textMuted, border),
    ...status("warning", number, statusBorder("apricot")),

    players: playerColors.map((c) => ({ cursor: c, background: c, selection: tint(c, 0.24) })),

    syntax: {
      attribute: s(type),
      boolean: s(number),
      comment: s(comment, italic),
      "comment.doc": s(ink("neutral", "subtle"), italic),
      constant: s(number),
      constructor: s(fn),
      "diff.minus": s(error),
      "diff.plus": s(string),
      embedded: s(fg),
      emphasis: s(accent, italic),
      "emphasis.strong": s(number, bold),
      enum: s(enumC),
      function: s(fn),
      hint: s(hint),
      keyword: s(keyword),
      label: s(enumC),
      link_text: s(enumC, italic),
      link_uri: s(teal),
      namespace: s(ink("neutral", "primary")),
      number: s(number),
      operator: s(ink("mauve", "muted")),
      predictive: s(predictive, italic),
      preproc: s(type),
      primary: s(fg),
      property: s(ink("blush", "primary")),
      punctuation: s(textMuted),
      "punctuation.bracket": s(textMuted),
      "punctuation.delimiter": s(textMuted),
      "punctuation.list_marker": s(keyword),
      "punctuation.markup": s(keyword),
      "punctuation.special": s(fn),
      selector: s(number),
      "selector.pseudo": s(type),
      string: s(string),
      "string.escape": s(keyword),
      "string.regex": s(number),
      "string.special": s(number),
      "string.special.symbol": s(enumC),
      tag: s(keyword),
      "text.literal": s(string),
      title: s(accent, bold),
      type: s(type),
      variable: s(fg),
      "variable.parameter": s(ink("cream", "primary")),
      "variable.special": s(keyword, italic),
      variant: s(enumC),
    },
  };
};
