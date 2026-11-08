// Berry: キャンバスそのものをピンクにする配色。
// 規則の説明はsrc/engine/palette.tsを参照。
//
// - 背景: Duskは深いベリー色、Dawnは桜色の紙。Peonyの背景の約4倍の彩度
//   （暗い色と、白から少し下げた明るさは、sRGBで出せる彩度に余裕がある）
// - 本文のグレーもピンク寄りにする
// - ほかの色: ピンクに近い暖色（ピーチ、ゴールド、ローズ）とラベンダー・ライラックでまとめ、文字列だけミント
// - error: keyword（0°）と関数（55°）の間のオレンジ寄り（36°）。どちらからも色差10以上離れる
// 段階（コントラストの目標値）、ターミナルの倍率、ブラー版の重ね方は、Peonyと同じ値にしている
// （Peonyを変えても追従しないよう、値を書き写している）。
import type { ThemeSet } from "../engine/palette.ts";

const BERRY = 350;

export const berry: ThemeSet = {
  id: "berry",
  family: "Berry",
  names: { dark: "Berry Dusk", light: "Berry Dawn" },
  palette: {
    config: {
      metric: "apca",
      lightChromaScale: 1.2,
      lightChromaMax: 0.22,
      lightOverlayScale: 0.8,
    },

    roles: {
      neutral: { h: BERRY, c: 0.05 }, // ピンク寄りのグレー（Peonyは0.027）
      // 背景（350°）と同じ色相だと、ピンクの文字が背景に溶け込むので、コーラル寄りにずらす
      // （355° / 356°から、比較用テーマで確認して採用）
      accent: { h: 0, c: 0.2 },
      keyword: { h: 0, c: 0.2 },
      activeLineNumber: { h: 355, c: 0.1 },
      operator: { h: BERRY, c: 0.08 },
      property: { h: 15, c: 0.09 }, // ローズ
      function: { h: 55, c: 0.11 }, // ピーチ（黄色寄り）
      number: { h: 88, c: 0.11 }, // ゴールド
      parameter: { h: 60, c: 0.07 },
      type: { h: 305, c: 0.12 }, // ラベンダー
      enum: { h: 285, c: 0.09 }, // ライラック
      hint: { h: 305, c: 0.07 },
      string: { h: 160, c: 0.11 }, // ミント
      link: { h: 175, c: 0.08 },
      vcsAdded: { h: 160, c: 0.12 },
      vcsModified: { h: 88, c: 0.1 },
      // オレンジ寄り。27°から、keywordと関数の両方との色差を比較用テーマで確認して採用
      error: { h: 36, c: 0.19 },
    },

    // Peonyと同じ値（各段階の意味はsrc/palettes/peony.tsを参照）
    tiers: {
      strong: { apca: 90, wcag: 13, floor: 7.5 },
      body: { apca: 81, wcag: 11.2, floor: 6 },
      primary: { apca: 71, wcag: 9.5, floor: 5.5 },
      accent: { apca: 60, wcag: 7.75, floor: 5 },
      muted: { apca: 52, wcag: 6.6, floor: 4.5 },
      subtle: { apca: 40, wcag: 4.9, floor: 3.6 },
      faint: { apca: 28, wcag: 3.6, floor: 3 },
      disabled: { apca: 21, wcag: 2.8, floor: 2.5 },
    },
    terminal: { brightScale: 1.15, dimScale: 0.6 },

    surface: {
      hue: BERRY,
      chroma: 0.06, // Peonyは0.016
      chromaPerStep: 0.12,
      // Dawnは白から少し下げて、ピンクの色味を乗せられるようにする（Peonyは0.97）
      editorL: { dark: 0.24, light: 0.95 },
      statusBorderChroma: 0.07,
    },

    // 重ね方はPeonyと同じ値（理由はsrc/palettes/peony.tsを参照）
    blur: {
      // 88〜96%を比較用テーマで見比べて決めた
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
