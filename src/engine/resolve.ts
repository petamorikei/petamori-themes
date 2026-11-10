// 配色（Palette）から、テーマ1つ分の具体的な色（hex）を計算する。エディタに依存しない。
// 各エディタ向けの対応付け（src/targets/<エディタ>/）は、ここで計算した色をキーに割り当てる。
//
// 文字の色は、その文字が乗る可能性のあるすべての背景の上で、WCAG 2の最低ラインを満たすように計算する。
// - コードの文字（inks）: エディタの背景と、その上に重なる現在行などのハイライト
// - UIの文字（ui）: 上に加えて、タイトルバー・パネル・ポップアップ・入力欄・hover・選択などの背景
// - ターミナルの文字（ansiColor）: エディタの背景だけ（ターミナルの背景はエディタと同じ）
import { hexOklch, oklchHex, over, solveInk, wcag, withAlpha } from "./color.ts";
import type { Mode, Palette, Role, Tier } from "./palette.ts";

export interface ResolveOptions {
  /**
   * エディタの背景として実際に見える色。省略時はエディタの背景の色だけ。
   * ブラー版では、半透明の背景を黒い壁紙と白い壁紙に重ねた色を渡す。
   */
  bases?: readonly string[];
  /** basesの上に重なる、コードの文字の下の色（現在行など）。省略時は不透明版の値 */
  editorOverlays?: readonly string[];
  /** basesの上に重なる、UIの文字の下の色（パネル、hoverなど）。省略時は不透明版の値 */
  uiOverlays?: readonly string[];
}

/** 生成した色の彩度が、指定より大きく下がったもの（sRGBに収まらなかったもの）を記録する */
export const gamutNotes: string[] = [];

const ANSI_NAMES = ["red", "green", "yellow", "blue", "magenta", "cyan"] as const;
export type AnsiName = (typeof ANSI_NAMES)[number];

/** 文字が乗る背景の範囲 */
type Context = "base" | "editor" | "ui";

/** 段階ごとのWCAG 2の最低ライン（本文や記号は4.5:1、コメントなど控えめな文字は3:1、無効な要素は2.5:1） */
export const WCAG_MIN: Record<Tier, number> = {
  strong: 4.5,
  body: 4.5,
  primary: 4.5,
  accent: 4.5,
  muted: 4.5,
  subtle: 3,
  faint: 3,
  disabled: 2.5,
};

export const resolveColors = (palette: Palette, mode: Mode, options: ResolveOptions = {}) => {
  const { config, roles, tiers, surface, terminal } = palette;
  const dark = mode === "dark";
  const editorL = surface.editorL[mode];
  const editorBg = oklchHex(editorL, surface.chroma, surface.hue);

  // ---- 背景と枠線 ----
  /** abs: 両テーマで同じ向きにずらす / fg: 文字に近づく向きにずらす */
  const surf = (offset: number, kind: "abs" | "fg", hue: number = surface.hue, chroma?: number): string => {
    const l = editorL + (kind === "abs" ? offset : dark ? offset : -offset);
    const c = chroma ?? surface.chroma + (kind === "fg" ? Math.abs(offset) * surface.chromaPerStep : 0);
    return oklchHex(l, c, hue);
  };

  // ---- 半透明 ----
  const overlayScale = dark ? 1 : config.lightOverlayScale;
  const tint = (hex: string, alpha: number): string => withAlpha(hex, alpha * overlayScale);

  // 背景の段差
  const surfaces = {
    chrome: surf(-0.05, "abs"), // タイトルバー、ステータスバー、ウィンドウ全体
    panel: surf(-0.03, "abs"), // パネル、タブバー
    editor: editorBg,
    elevated: surf(0.02, "abs"), // ポップアップ、コマンドパレット
    elementBg: surf(0.03, "fg"),
    subheader: surf(0.025, "fg"),
    highlighted: surf(0.05, "fg"),
    hover: surf(0.065, "fg"),
    muted: surf(0.08, "fg"), // 無効な枠線
    active: surf(0.105, "fg"),
    border: surf(0.125, "fg"),
    strongLine: surf(0.15, "fg"), // 不可視文字、アクティブなインデントガイド
    trackBorder: surf(0.02, "fg"),
    selectedBorder: surf(0.15, "fg", roles.accent.h, 0.05),
  };
  /** 現在行のハイライト（エディタの背景に重ねる半透明の色） */
  const activeLine = tint(surfaces.hover, 0.6);

  // ---- 文字が乗る背景 ----
  // basesでは段階ごとの最低ライン（段階の差を保つためのデザイン上の値）を、
  // 重なる背景（現在行、パネル、hover、選択など）ではWCAG 2の最低ライン（WCAG_MIN）を満たす。
  // 一時的なハイライト（検索結果、ジャンプ先の行など）は文字の色の計算には含めず、検査で扱う
  const bases = options.bases ?? [editorBg];
  const editorOverlays = options.editorOverlays ?? [activeLine];
  const uiOverlays = options.uiOverlays ?? [
    surfaces.chrome,
    surfaces.panel,
    surfaces.elevated,
    surfaces.elementBg,
    surfaces.subheader,
    surfaces.hover,
    surfaces.active,
  ];
  const onBases = (colors: readonly string[]) => bases.flatMap((b) => colors.map((c) => over(c, b)));
  /** basesの上に重なる背景（文字の範囲ごと） */
  const overlaid: Record<Context, string[]> = {
    base: [],
    editor: onBases(editorOverlays),
    ui: [...onBases(editorOverlays), ...onBases(uiOverlays)],
  };

  // ---- 文字の色 ----
  const cache = new Map<string, string>();
  /**
   * scale: 段階の目標値にかける倍率（ターミナルのbright / dim用）。floor: WCAG 2の最低ラインを段階の値から変える。
   * on: どの範囲の背景の上で最低ラインを満たすか（省略時はコードの文字の範囲）
   */
  const ink = (role: Role, tier: Tier, opts: { scale?: number; floor?: number; on?: Context } = {}): string => {
    const scale = opts.scale ?? 1;
    const floor = opts.floor ?? tiers[tier].floor;
    const on = opts.on ?? "editor";
    const key = `${role}/${tier}/${scale}/${floor}/${on}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const { h, c } = roles[role];
    const chroma = dark ? c : Math.min(c * config.lightChromaScale, config.lightChromaMax);
    const solve = (f: number, bgs: readonly string[]) =>
      solveInk({
        hue: h,
        chroma,
        target: tiers[tier][config.metric] * scale,
        metric: config.metric,
        bg: editorBg,
        direction: dark ? "up" : "down",
        floor: f,
        floorBgs: bgs,
      });
    // basesでは段階の最低ライン、重なる背景ではWCAG 2の最低ラインを満たす。背景から遠いほう（両方を満たすほう）を使う
    const onBase = solve(floor, bases);
    const onOverlay = overlaid[on].length ? solve(Math.min(floor, WCAG_MIN[tier]), overlaid[on]) : onBase;
    const hex = wcag(onOverlay, editorBg) > wcag(onBase, editorBg) ? onOverlay : onBase;
    cache.set(key, hex);
    const got = hexOklch(hex).c;
    if (chroma - got > 0.005) {
      gamutNotes.push(`${mode} ${role}/${tier}: 彩度${chroma.toFixed(3)} → ${got.toFixed(3)}（sRGBに収まらないため）`);
    }
    return hex;
  };

  // コードの文字
  const inks = {
    text: ink("neutral", "strong"),
    fg: ink("neutral", "body"),
    textMuted: ink("neutral", "muted"),
    placeholder: ink("neutral", "faint"),
    disabled: ink("neutral", "disabled"),
    accent: ink("accent", "accent"),
    keyword: ink("keyword", "accent"),
    function: ink("function", "primary"),
    type: ink("type", "accent"),
    string: ink("string", "primary"),
    number: ink("number", "primary"),
    enum: ink("enum", "primary"),
    link: ink("link", "primary"),
    // errorは彩度がとても高く明るく見えるので、mutedの段階まで下げる
    error: ink("error", "muted"),
    hint: ink("hint", "muted"),
    comment: ink("neutral", "faint"),
    predictive: ink("neutral", "faint"),
    // ガターの印は面積が小さいので彩度を残したい。accentの段階にして、ライトで暗くなりすぎないようfloorは4.5にする
    vcsAdded: ink("vcsAdded", "accent", { floor: 4.5 }),
    vcsModified: ink("vcsModified", "accent", { floor: 4.5 }),
    activeLineNumber: ink("activeLineNumber", "primary"),
    commentDoc: ink("neutral", "subtle"),
    namespace: ink("neutral", "primary"),
    operator: ink("operator", "muted"),
    property: ink("property", "primary"),
    parameter: ink("parameter", "primary"),
  };

  // UIの文字（タイトルバー、パネル、ポップアップ、hover・選択などの上にも乗る）
  const ui = {
    text: ink("neutral", "strong", { on: "ui" }),
    textMuted: ink("neutral", "muted", { on: "ui" }),
    placeholder: ink("neutral", "faint", { on: "ui" }),
    disabled: ink("neutral", "disabled", { on: "ui" }),
    accent: ink("accent", "accent", { on: "ui" }),
    link: ink("link", "primary", { on: "ui" }),
    error: ink("error", "muted", { on: "ui" }),
    warning: ink("number", "primary", { on: "ui" }),
    success: ink("string", "primary", { on: "ui" }),
    info: ink("enum", "primary", { on: "ui" }),
    conflict: ink("function", "primary", { on: "ui" }),
    hint: ink("hint", "muted", { on: "ui" }),
    vcsAdded: ink("vcsAdded", "accent", { floor: 4.5, on: "ui" }),
    vcsModified: ink("vcsModified", "accent", { floor: 4.5, on: "ui" }),
    // 枠線（文字ではないので3:1）
    focusBorder: ink("accent", "muted", { floor: 3, on: "ui" }),
  };

  // 状態色の枠線: 役割の色相で、背景からborderと同じだけ離す
  const statusBorder = (role: Role): string => surf(0.125, "fg", roles[role].h, surface.statusBorderChroma);

  // ANSIのblack / whiteは「blackは暗い、whiteは明るい」の意味どおりにする
  const term = (role: Role, tier: Tier, opts: { scale?: number; floor?: number } = {}) =>
    ink(role, tier, { ...opts, on: "base" });
  const ansiBW = dark
    ? {
        black: surfaces.hover,
        brightBlack: term("neutral", "faint"),
        dimBlack: surfaces.elevated,
        white: term("neutral", "body"),
        brightWhite: term("neutral", "strong"),
        dimWhite: term("neutral", "subtle", { floor: 0 }),
      }
    : {
        black: term("neutral", "strong"),
        brightBlack: term("neutral", "faint"),
        dimBlack: term("neutral", "muted"),
        white: surfaces.border,
        brightWhite: surfaces.elevated,
        dimWhite: term("neutral", "disabled"),
      };

  // ANSIの色: 通常はシンタックスと同じ段階。brightとdimは、その目標値に倍率をかける
  // （ライトではbrightのほうが背景から遠い＝暗くなる）
  const ansiRoles: Record<AnsiName, [Role, Tier]> = {
    red: ["error", "muted"],
    green: ["string", "primary"],
    yellow: ["number", "primary"],
    blue: ["enum", "primary"],
    magenta: ["accent", "accent"],
    cyan: ["link", "primary"],
  };
  const ansiColor = (name: AnsiName) => {
    const [role, tier] = ansiRoles[name];
    return {
      normal: term(role, tier),
      bright: term(role, tier, { scale: terminal.brightScale }),
      dim: term(role, tier, { scale: terminal.dimScale, floor: 0 }),
    };
  };
  const terminalInks = {
    fg: term("neutral", "body"),
    brightFg: term("neutral", "strong"),
    dimFg: term("neutral", "faint"),
  };

  return {
    mode,
    dark,
    editorBg,
    activeLine,
    surfaces,
    inks,
    ui,
    terminalInks,
    ink,
    surf,
    tint,
    statusBorder,
    ansiBW,
    ansiColor,
    ANSI_NAMES,
  };
};

export type Resolved = ReturnType<typeof resolveColors>;
