// テーマに依存しない配色の型。各テーマはsrc/palettes/でこの型の値を定義する。
//
// 規則:
// - 文字の色（ink）は「役割の色相Hと彩度C」×「段階（コントラストの目標値）」で決まる。
//   明度Lは、エディタの背景とのコントラストが段階の目標値になるように自動で計算する。
//   ダークとライトは同じH・C・段階を使うので、片方を変えればもう片方も同じ規則で変わる。
// - 背景や枠線（surface）は、エディタの背景からの明度の差で決まる。
// - 半透明の色（overlay）は、inkやsurfaceにアルファを付けたもの。
import type { Metric } from "./color.ts";

export type Mode = "dark" | "light";

/** 色の役割。各エディタ向けの対応付け（src/targets/<エディタ>/）が、どのキーにどの役割を使うかを決める */
export type Role =
  /** 文字や背景の基本色（グレー） */
  | "neutral"
  /** UIアクセント、自分のカーソル、見出し、ANSI magenta */
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
  /** 役割ごとの色相H（度）と彩度C（OKLCH）。ライトテーマの彩度はC × lightChromaScale */
  roles: Record<Role, { h: number; c: number }>;
  /** 段階ごとのコントラストの目標値（APCAのLcとWCAG 2の比）と、WCAG 2の最低ラインfloor */
  tiers: Record<Tier, { apca: number; wcag: number; floor: number }>;
  /** ターミナルのbright / dimは、通常色の段階の目標値にこの倍率をかける */
  terminal: { brightScale: number; dimScale: number };
  /**
   * 背景と枠線。エディタの背景の明度editorLだけがテーマごとの値で、ほかは差で決まる。
   * 彩度はchromaに、文字に近づく向きのずれの大きさ × chromaPerStepを足したもの。
   */
  surface: {
    hue: number;
    chroma: number;
    chromaPerStep: number;
    editorL: Record<Mode, number>;
    /** 状態色（errorなど）の枠線の彩度 */
    statusBorderChroma: number;
  };
  /**
   * ブラー版の設定。
   * - opacity: 不透明度。backgroundの末尾2桁になる
   * - overlay: 「不透明版のキーの色」にアルファを付けて重ねる
   */
  blur: { opacity: number; overlay: Record<Mode, Overlay> };
}

/** 1つのテーマファミリー（ダークとライト、それぞれのブラー版を生成する） */
export interface ThemeSet {
  /** ファイル名に使う（zed/themes/<id>.json、zed/themes/<id>-blur.json） */
  id: string;
  /** テーマファミリーの名前（ブラー版は末尾に" Blur"を付ける） */
  family: string;
  /** テーマセレクターに出る名前 */
  names: Record<Mode, string>;
  palette: Palette;
}
