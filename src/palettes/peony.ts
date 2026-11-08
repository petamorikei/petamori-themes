// Peony: 落ち着いたピンクを軸にした配色。色を変えるときはこのファイルだけを編集する。
// 規則の説明はsrc/engine/palette.tsを参照。
import type { ThemeSet } from "../engine/palette.ts";

/** 文字や背景の基本色（ピンク寄りのグレー）の色相。背景と枠線も同じ色相にする */
const NEUTRAL_HUE = 345;

export const peony: ThemeSet = {
  id: "peony",
  family: "Peony",
  names: { dark: "Peony Dusk", light: "Peony Dawn" },
  palette: {
    config: {
      // WCAG 2はダーク側を高めに見積もるので、目立ち方を揃えるためにAPCAを使う
      metric: "apca",
      // 明るい背景の上では同じ彩度だと色が薄く見えるため
      lightChromaScale: 1.5,
      // errorのように元から彩度が高い色が、明るい背景の上でどぎつくならないようにする
      lightChromaMax: 0.165,
      // 明るい背景の上では半透明色が濃く見えるため
      lightOverlayScale: 0.8,
    },

    // 値はDuskの色から読み取ったもの。
    // ローズ系（accent、keyword、activeLineNumber）の彩度は、ピンクを少し強く感じられるように、
    // 比較用テーマで見比べて上げた（C''案。カッコ内は元の値）。
    roles: {
      neutral: { h: NEUTRAL_HUE, c: 0.027 },
      accent: { h: 352.9, c: 0.0931 }, // ローズ(0.0875)
      keyword: { h: 353.2, c: 0.1029 }, // 鮮やかなローズ(0.0972)
      activeLineNumber: { h: 350.2, c: 0.0514 }, // 淡いローズ(0.0468)
      function: { h: 39.2, c: 0.0795 }, // ピーチ
      type: { h: 303.1, c: 0.102 }, // ラベンダー
      string: { h: 129.5, c: 0.0755 }, // セージ
      number: { h: 71.3, c: 0.0866 }, // アプリコット
      enum: { h: 259.4, c: 0.0648 }, // くすんだ青
      link: { h: 184.6, c: 0.0637 }, // ティール
      error: { h: 31.7, c: 0.1441 }, // コーラル。ピンクと区別するためオレンジ寄り
      hint: { h: 301.1, c: 0.0626 }, // すみれ
      operator: { h: 348.2, c: 0.0506 }, // モーブ
      property: { h: 1.5, c: 0.0519 }, // ブラッシュ
      parameter: { h: 51.3, c: 0.0507 }, // クリーム
      vcsAdded: { h: 136, c: 0.0976 }, // 緑
      vcsModified: { h: 77.4, c: 0.0946 }, // 琥珀
    },

    // 段階ごとのコントラストの目標値（エディタの背景に対して）。値はDuskの平均から決めた。
    // floorはWCAG 2の最低ライン。目標値で計算した色がこれに届かないときは、さらに背景から離す。
    //
    // 明るい背景では、APCAの中間の値がWCAG 2では低く出る（Lc 52で約2.9:1）。そのためDawnでは
    // primaryより下の段階がfloorで決まる。floorを段階ごとに少しずつずらしているのは、
    // Dawnで段階の差が潰れないようにするため。Duskはどの段階もfloorより十分高いので影響しない。
    // strongとbodyのfloorは不透明版には効かないが、ブラー版で下の段階が本文に追いつかないようにする。
    tiers: {
      strong: { apca: 90, wcag: 13, floor: 7.5 }, // UIの文字、ターミナルの明るい前景
      body: { apca: 81, wcag: 11.2, floor: 6 }, // エディタの本文、変数、ターミナルの前景
      primary: { apca: 71, wcag: 9.5, floor: 5.5 }, // 関数、文字列、数値など、主要なシンタックス
      accent: { apca: 60, wcag: 7.75, floor: 5 }, // 彩度の高い色（keyword、type、アクセント）は明るく見えるので一段下げる
      muted: { apca: 52, wcag: 6.6, floor: 4.5 }, // text.muted、句読点、演算子、error
      subtle: { apca: 40, wcag: 4.9, floor: 3.6 }, // ドキュメントコメント、ターミナルのdim系
      faint: { apca: 28, wcag: 3.6, floor: 3 }, // コメント、行番号、predictive、プレースホルダー
      disabled: { apca: 21, wcag: 2.8, floor: 2.5 }, // 無効な要素（見えなくならないよう2.5:1は残す）
    },

    // Duskの通常色とbright / dimの比から決めた
    terminal: { brightScale: 1.15, dimScale: 0.6 },

    surface: {
      hue: NEUTRAL_HUE,
      chroma: 0.016,
      chromaPerStep: 0.11,
      editorL: { dark: 0.255, light: 0.97 },
      statusBorderChroma: 0.045,
    },

    // 不透明度はDuskとDawnで共通（90〜95%と80〜95%を実機で見比べて94%に決めた）。
    // overlayは、明るい背景の上では薄く見えるので、Dawnはアルファを高めにしている。
    blur: {
      opacity: 0.94,
      overlay: {
        dark: {
          // ファイルツリーの各行はpanel.backgroundと同じ色の枠線を持ち、枠線は背景の上に重ねて描かれる。
          // 半透明だと枠線の部分だけ濃くなって行ごとの線に見えるので、完全に透明にする（比較用テーマで確認して採用）
          "panel.background": ["background", 0],
          // スティッキースクロールで上に固定される行の背景。下を流れる行を隠すため不透明にする必要がある。
          // パネルが透明なので、見た目が近いエディタの色にする（省略するとZedはパネルの暗い色で塗る）
          "panel.overlay_background": ["editor.background", 1],
          // タブバーの下には全幅の枠線が1本引かれていて（Zedのtab_bar.rs）、アクティブなタブの背景がそれを覆い隠す。
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
    },
  },
};
