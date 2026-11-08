// Fuchsia（案A「ネオン」から）: 無彩色のキャンバスに、ピンクが主役。
// 規則の説明はsrc/engine/palette.tsを参照。
//
// - 背景: Duskはほぼ黒、Dawnはほぼ白。色味はほとんど乗せない
// - ピンク: keyword・アクセントに、sRGBで出せる限界まで鮮やかなホットピンクを使う
// - ほかの色: 文字列だけミント（ピンクの補色に近い色）。関数・型・数値などは彩度を落として控えめにする。
//   周りが無彩色だと、同じ色でも鮮やかに見える（色の対比）ことを利用する
// - error: ピンクと見分けやすいよう、オレンジ寄りにする（関数がピーチではないので、オレンジと重ならない）
// 段階（コントラストの目標値。accentを除く）、ターミナルの倍率、ブラー版の設定は、Peonyと同じ値にしている
// （Peonyを変えても追従しないよう、値を書き写している）。
import type { ThemeSet } from "../engine/palette.ts";

const PINK = 355;

export const fuchsia: ThemeSet = {
  id: "fuchsia",
  family: "Fuchsia",
  names: { dark: "Fuchsia Dusk", light: "Fuchsia Dawn" },
  palette: {
    config: {
      metric: "apca",
      // 元の彩度を高めに指定しているので、ライトで倍率はかけない。上限はsRGBに任せる
      lightChromaScale: 1,
      lightChromaMax: 0.3,
      lightOverlayScale: 0.8,
    },

    roles: {
      neutral: { h: PINK, c: 0.008 }, // ほぼ無彩色のグレー
      accent: { h: PINK, c: 0.3 }, // ホットピンク（実際の彩度はsRGBの限界で決まる）
      keyword: { h: 356, c: 0.3 },
      activeLineNumber: { h: PINK, c: 0.12 },
      operator: { h: PINK, c: 0.1 }, // 演算子もピンク寄りにして、ピンクの面積を増やす
      string: { h: 165, c: 0.12 }, // ミント
      vcsAdded: { h: 165, c: 0.13 },
      // ここから下は控えめにする
      function: { h: 50, c: 0.025 }, // ほぼグレー（わずかに暖色）
      type: { h: 300, c: 0.06 }, // くすんだラベンダー
      number: { h: 80, c: 0.06 }, // くすんだゴールド
      enum: { h: 245, c: 0.05 }, // くすんだ青
      link: { h: 190, c: 0.08 },
      property: { h: PINK, c: 0.02 },
      parameter: { h: 50, c: 0.03 },
      hint: { h: 300, c: 0.06 },
      vcsModified: { h: 80, c: 0.1 },
      error: { h: 42, c: 0.19 }, // オレンジ。ピンク（355°）との色相差は約47°
    },

    // accent以外はPeonyと同じ値（各段階の意味はsrc/palettes/peony.tsを参照）
    tiers: {
      strong: { apca: 90, wcag: 13, floor: 7.5 },
      body: { apca: 81, wcag: 11.2, floor: 6 },
      primary: { apca: 71, wcag: 9.5, floor: 5.5 },
      // keyword・アクセント・型の段階。ダークでPeonyのLc 60から55に下げ、ピンクを鮮やかにする
      // （比較用テーマで確認して採用）。ライトはこの段階がWCAG 2の最低ライン（5）で決まるので変わらない
      accent: { apca: 55, wcag: 7.75, floor: 5 },
      muted: { apca: 52, wcag: 6.6, floor: 4.5 },
      subtle: { apca: 40, wcag: 4.9, floor: 3.6 },
      faint: { apca: 28, wcag: 3.6, floor: 3 },
      disabled: { apca: 21, wcag: 2.8, floor: 2.5 },
    },
    terminal: { brightScale: 1.15, dimScale: 0.6 },

    surface: {
      hue: PINK,
      chroma: 0.004,
      chromaPerStep: 0.02,
      // ほぼ黒 / ほぼ白。真っ黒（文字がにじんで見えやすい）と真っ白（まぶしい）は避ける
      // （0.18 / 0.995から、比較用テーマで確認して採用）
      editorL: { dark: 0.2, light: 0.985 },
      statusBorderChroma: 0.05,
    },

    // Peonyと同じ値（理由はsrc/palettes/peony.tsを参照）
    blur: {
      opacity: 0.94,
      overlay: {
        dark: {
          "panel.background": ["background", 0],
          "panel.overlay_background": ["editor.background", 1],
          "tab.active_background": ["editor.background", 1],
          "tab_bar.background": ["background", 0.3],
          "surface.background": ["background", 0.3],
          "elevated_surface.background": ["elevated_surface.background", 0.95],
          "editor.subheader.background": ["editor.subheader.background", 0.5],
          "editor.active_line.background": ["element.hover", 0.4],
          "editor.highlighted_line.background": ["element.hover", 0.5],
          "element.background": ["element.hover", 0.4],
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
    },
  },
};
