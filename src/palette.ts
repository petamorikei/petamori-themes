// Peony の配色の元データ。色を変えるときはこのファイルだけを編集する。
//
// 規則:
// - 文字の色（ink）は「役割の色相 H と彩度 C」×「段階（コントラストの目標値）」で決まる。
//   明度 L は、エディタの背景とのコントラストが段階の目標値になるように自動で計算する。
//   Dusk と Dawn は同じ H・C・段階を使うので、Dusk を変えれば Dawn も同じ規則で変わる。
// - 背景や枠線（surface）は、エディタの背景からの明度の差で決まる。
// - 半透明の色（overlay）は、ink や surface にアルファを付けたもの。

import type { Metric } from "./color.ts";

export type Mode = "dark" | "light";

export const config = {
  /** 明度を合わせるコントラストの指標。WCAG 2 はダーク側を高めに見積もるので、目立ち方を揃えるために APCA を使う */
  metric: "apca" as Metric,
  /** ライトテーマでは文字の彩度をこの倍率にする（明るい背景の上では同じ彩度だと色が薄く見えるため） */
  lightChromaScale: 1.5,
  /** ライトテーマの彩度の上限。error のように元から彩度が高い色が、明るい背景の上でどぎつくならないようにする */
  lightChromaMax: 0.165,
  /** ライトテーマでは選択範囲などの半透明色のアルファをこの倍率にする（明るい背景の上では濃く見えるため） */
  lightOverlayScale: 0.8,
};

/**
 * 役割ごとの色相 H（度）と彩度 C（OKLCH）。値は Dusk の色から読み取ったもの。
 * ライトテーマの彩度は C × config.lightChromaScale（sRGB に収まらなければ自動で下がる）。
 * ローズ3色の彩度は、ピンクを少し強く感じられるように、比較用テーマで見比べて上げた（C'' 案。カッコ内は元の値）。
 */
export const roles = {
  /** 文字や背景の基本色（ピンク寄りのグレー） */
  neutral: { h: 345, c: 0.027 },
  /** UI アクセント、自分のカーソル、見出し */
  rose: { h: 352.9, c: 0.0931 }, // (0.0875)
  /** keyword、tag */
  roseVivid: { h: 353.2, c: 0.1029 }, // (0.0972)
  /** 現在行の行番号 */
  rosePale: { h: 350.2, c: 0.0514 }, // (0.0468)
  /** function、constructor */
  peach: { h: 39.2, c: 0.0795 },
  /** type、attribute、preproc */
  lavender: { h: 303.1, c: 0.102 },
  /** string */
  sage: { h: 129.5, c: 0.0755 },
  /** number、constant、boolean */
  apricot: { h: 71.3, c: 0.0866 },
  /** enum、variant、label */
  blue: { h: 259.4, c: 0.0648 },
  /** link_uri、ANSI cyan */
  teal: { h: 184.6, c: 0.0637 },
  /** error。ピンクと区別するためオレンジ寄り */
  coral: { h: 31.7, c: 0.1441 },
  /** hint */
  violet: { h: 301.1, c: 0.0626 },
  /** operator */
  mauve: { h: 348.2, c: 0.0506 },
  /** property */
  blush: { h: 1.5, c: 0.0519 },
  /** variable.parameter */
  cream: { h: 51.3, c: 0.0507 },
  /** バージョン管理の追加（ガターの印） */
  vcsGreen: { h: 136, c: 0.0976 },
  /** バージョン管理の変更（ガターの印） */
  vcsAmber: { h: 77.4, c: 0.0946 },
} as const;

export type Role = keyof typeof roles;

/**
 * 段階ごとのコントラストの目標値（エディタの背景に対して）。値は今の Dusk の平均から決めた。
 * floor は WCAG 2 の最低ライン。目標値で計算した色がこれに届かないときは、さらに背景から離す。
 *
 * 明るい背景では、APCA の中間の値が WCAG 2 では低く出る（Lc 52 で約 2.9:1）。そのため Dawn では
 * primary より下の段階が floor で決まる。floor を段階ごとに少しずつずらしているのは、
 * Dawn で段階の差が潰れないようにするため。Dusk はどの段階も floor より十分高いので影響しない。
 */
export const tiers = {
  /** UI の文字、ターミナルの明るい前景 */
  strong: { apca: 90, wcag: 13, floor: 7.5 },
  /** エディタの本文、変数、ターミナルの前景・bright 系 */
  body: { apca: 81, wcag: 11.2, floor: 6 },
  /** 関数、文字列、数値など、主要なシンタックス */
  primary: { apca: 71, wcag: 9.5, floor: 5.5 },
  /** 彩度の高い色（keyword、type、アクセント）。彩度が高い色は明るく見えるので一段下げる */
  accent: { apca: 60, wcag: 7.75, floor: 5 },
  /** text.muted、句読点、演算子、error（error は彩度がとても高く明るく見えるので、ここまで下げる） */
  muted: { apca: 52, wcag: 6.6, floor: 4.5 },
  /** ドキュメントコメント、ターミナルの dim 系 */
  subtle: { apca: 40, wcag: 4.9, floor: 3.6 },
  /** コメント、行番号、predictive、プレースホルダー */
  faint: { apca: 28, wcag: 3.6, floor: 3 },
  /** 無効な要素（見えなくならないよう、WCAG 2 で 2.5:1 は残す） */
  disabled: { apca: 21, wcag: 2.8, floor: 2.5 },
} as const;

/** ターミナルの bright / dim は、通常色の段階の目標値にこの倍率をかける（今の Dusk の比から決めた） */
export const terminal = { brightScale: 1.15, dimScale: 0.6 } as const;

export type Tier = keyof typeof tiers;

/**
 * 背景と枠線。エディタの背景の明度 editorL だけがテーマごとの値で、ほかは差で決まる。
 * - "abs": 両テーマで同じ向きにずらす（タイトルバー < パネル < エディタ < ポップアップ）
 * - "fg" : 文字に近づく向きにずらす（Dusk は明るく、Dawn は暗く）
 * 彩度は chroma に、"fg" のずれの大きさ × chromaPerStep を足したもの。
 */
export const surface = {
  hue: roles.neutral.h,
  chroma: 0.016,
  chromaPerStep: 0.11,
  editorL: { dark: 0.255, light: 0.97 } satisfies Record<Mode, number>,
  /** 状態色（error など）の枠線の彩度 */
  statusBorderChroma: 0.045,
} as const;

type Overlay = Record<string, [source: string, alpha: number]>;

/**
 * ブラー版の設定。
 * - opacity: 不透明度。background の末尾2桁になる。Dusk と Dawn で共通（90〜95% と 80〜95% を実機で見比べて 94% に決めた）
 * - overlay: 「不透明版のキーの色」にアルファを付けて重ねる。明るい背景の上では薄く見えるので、Dawn はアルファを高めにしている
 */
export const blur: { opacity: number; overlay: Record<Mode, Overlay> } = {
  opacity: 0.94,
  overlay: {
    dark: {
      // ファイルツリーの各行は panel.background と同じ色の枠線を持ち、枠線は背景の上に重ねて描かれる。
      // 半透明だと枠線の部分だけ濃くなって行ごとの線に見えるので、完全に透明にする（比較用テーマで確認して採用）
      "panel.background": ["background", 0],
      // スティッキースクロールで上に固定される行の背景。下を流れる行を隠すため不透明にする必要がある。
      // パネルが透明なので、見た目が近いエディタの色にする（省略すると Zed はパネルの暗い色で塗る）
      "panel.overlay_background": ["editor.background", 1],
      // タブバーの下には全幅の枠線が1本引かれていて（Zed の tab_bar.rs）、アクティブなタブの背景がそれを覆い隠す。
      // 透明だと線が透け、ほかのタブとも見分けにくいので、エディタと同じ色の不透明にする（比較用テーマで確認して採用）
      "tab.active_background": ["editor.background", 1],
      "tab_bar.background": ["background", 0.3],
      "surface.background": ["background", 0.3],
      "elevated_surface.background": ["elevated_surface.background", 0.95],
      "editor.subheader.background": ["editor.subheader.background", 0.5],
      "editor.active_line.background": ["element.hover", 0.4],
      "editor.highlighted_line.background": ["element.hover", 0.5],
      "element.background": ["element.hover", 0.4],
      // hover・押下中・選択は不透明にする。ファイルツリーやアウトラインの行は、hover・選択時に背景と同じ色の
      // 枠線を持つので、半透明だと縁が濃く見えるため（比較用テーマで確認して採用）
      "element.hover": ["element.hover", 1],
      "element.active": ["element.active", 1],
      "element.selected": ["element.active", 1],
      "element.disabled": ["element.disabled", 0.4],
      "ghost_element.hover": ["element.hover", 1],
      "ghost_element.active": ["element.active", 1],
      "ghost_element.selected": ["element.active", 1],
      "ghost_element.disabled": ["element.disabled", 0.4],
    },
    light: {
      "panel.background": ["background", 0],
      "panel.overlay_background": ["editor.background", 1],
      "tab.active_background": ["editor.background", 1],
      "tab_bar.background": ["background", 0.3],
      "surface.background": ["background", 0.3],
      "elevated_surface.background": ["elevated_surface.background", 0.95],
      "editor.subheader.background": ["editor.subheader.background", 0.5],
      "editor.active_line.background": ["element.active", 0.3],
      "editor.highlighted_line.background": ["element.active", 0.4],
      "element.background": ["element.background", 0.6],
      "element.hover": ["element.hover", 1],
      "element.active": ["element.active", 1],
      "element.selected": ["element.active", 1],
      "element.disabled": ["element.background", 0.4],
      "ghost_element.hover": ["element.hover", 1],
      "ghost_element.active": ["element.active", 1],
      "ghost_element.selected": ["element.active", 1],
      "ghost_element.disabled": ["element.background", 0.4],
    },
  },
};

/** 配色一式。比較用テーマ（src/variants.ts）は、これを複製して一部を書き換える */
export interface Palette {
  config: { metric: Metric; lightChromaScale: number; lightChromaMax: number; lightOverlayScale: number };
  roles: Record<Role, { h: number; c: number }>;
  tiers: Record<Tier, { apca: number; wcag: number; floor: number }>;
  terminal: { brightScale: number; dimScale: number };
  surface: {
    hue: number;
    chroma: number;
    chromaPerStep: number;
    editorL: Record<Mode, number>;
    statusBorderChroma: number;
  };
  blur: { opacity: number; overlay: Record<Mode, Overlay> };
}

export const palette: Palette = { config, roles, tiers, terminal, surface, blur };
