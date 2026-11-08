// テーマに依存しない配色の型。各テーマは src/palettes/ でこの型の値を定義する。
//
// 規則:
// - 文字の色（ink）は「役割の色相 H と彩度 C」×「段階（コントラストの目標値）」で決まる。
//   明度 L は、エディタの背景とのコントラストが段階の目標値になるように自動で計算する。
//   ダークとライトは同じ H・C・段階を使うので、片方を変えればもう片方も同じ規則で変わる。
// - 背景や枠線（surface）は、エディタの背景からの明度の差で決まる。
// - 半透明の色（overlay）は、ink や surface にアルファを付けたもの。
import type { Metric } from "./color.ts";

export type Mode = "dark" | "light";

/** 色の役割。theme.ts がどのキーにどの役割を使うかを決める */
export type Role =
  /** 文字や背景の基本色（グレー） */
  | "neutral"
  /** UI アクセント、自分のカーソル、見出し、ANSI magenta */
  | "accent"
  /** keyword、tag */
  | "keyword"
  /** 現在行の行番号 */
  | "activeLineNumber"
  /** function、constructor */
  | "function"
  /** type、attribute、preproc */
  | "type"
  /** string、ANSI green */
  | "string"
  /** number、constant、boolean、ANSI yellow */
  | "number"
  /** enum、variant、label、ANSI blue */
  | "enum"
  /** link_uri、ANSI cyan */
  | "link"
  /** error、ANSI red */
  | "error"
  /** hint */
  | "hint"
  /** operator */
  | "operator"
  /** property */
  | "property"
  /** variable.parameter */
  | "parameter"
  /** バージョン管理の追加（ガターの印） */
  | "vcsAdded"
  /** バージョン管理の変更（ガターの印） */
  | "vcsModified";

/** コントラストの段階 */
export type Tier = "strong" | "body" | "primary" | "accent" | "muted" | "subtle" | "faint" | "disabled";

export type Overlay = Record<string, [source: string, alpha: number]>;

/** 配色一式。比較用テーマ（src/variants.ts）は、これを複製して一部を書き換える */
export interface Palette {
  config: {
    /** 明度を合わせるコントラストの指標 */
    metric: Metric;
    /** ライトテーマでは文字の彩度をこの倍率にする */
    lightChromaScale: number;
    /** ライトテーマの彩度の上限 */
    lightChromaMax: number;
    /** ライトテーマでは選択範囲などの半透明色のアルファをこの倍率にする */
    lightOverlayScale: number;
  };
  /** 役割ごとの色相 H（度）と彩度 C（OKLCH）。ライトテーマの彩度は C × lightChromaScale */
  roles: Record<Role, { h: number; c: number }>;
  /** 段階ごとのコントラストの目標値（APCA の Lc と WCAG 2 の比）と、WCAG 2 の最低ライン floor */
  tiers: Record<Tier, { apca: number; wcag: number; floor: number }>;
  /** ターミナルの bright / dim は、通常色の段階の目標値にこの倍率をかける */
  terminal: { brightScale: number; dimScale: number };
  /**
   * 背景と枠線。エディタの背景の明度 editorL だけがテーマごとの値で、ほかは差で決まる。
   * 彩度は chroma に、文字に近づく向きのずれの大きさ × chromaPerStep を足したもの。
   */
  surface: {
    hue: number;
    chroma: number;
    chromaPerStep: number;
    editorL: Record<Mode, number>;
    /** 状態色（error など）の枠線の彩度 */
    statusBorderChroma: number;
  };
  /**
   * ブラー版の設定。
   * - opacity: 不透明度。background の末尾2桁になる
   * - overlay: 「不透明版のキーの色」にアルファを付けて重ねる
   */
  blur: { opacity: number; overlay: Record<Mode, Overlay> };
}

/** 1つのテーマファミリー（ダークとライト、それぞれのブラー版を生成する） */
export interface ThemeSet {
  /** ファイル名に使う（themes/<id>.json、themes/<id>-blur.json） */
  id: string;
  /** テーマファミリーの名前（ブラー版は末尾に " Blur" を付ける） */
  family: string;
  /** テーマセレクターに出る名前 */
  names: Record<Mode, string>;
  palette: Palette;
}
