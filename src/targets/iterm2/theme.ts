// 配色（Palette）の規則から、iTerm2のカラープリセット1つ分（1つのモード）の色を組み立てる。
// 色の計算はsrc/engine/resolve.ts、どのキーにどの色を使うかはここで決める（すべてのテーマで共通）。
// ターミナルの色は、Zed版・VS Code版のterminal.*と同じものを使う。
//
// 選択範囲（Selection Color）と検索の一致箇所（Match Background Color）は、半透明の色をエディタの背景に重ねて
// 不透明にしてから書き出す。同梱のプリセットでアルファが1でないのはCursor Guide ColorとBadge Colorだけなので、それにならう
// （iTerm2がこの2つのアルファをどう扱うかは確かめていない）。

import { over, withAlpha } from "../../engine/color.ts";
import type { Mode, Palette } from "../../engine/palette.ts";
import { resolveColors } from "../../engine/resolve.ts";

/** キーと色（#rrggbbまたは#rrggbbaa）。キーはiTerm2のプロファイルのキー名（"Ansi 0 Color"など） */
export type ItermColors = Record<string, string>;

export const buildItermColors = (palette: Palette, mode: Mode): ItermColors => {
  const r = resolveColors(palette, mode);
  const { tint } = r;
  const i = r.inks;
  const t = r.terminalInks;
  /** 半透明の色をエディタの背景に重ねて、不透明にする */
  const solid = (hex: string): string => over(hex, r.editorBg);

  // ANSIの0〜7が通常色、8〜15がbright。iTerm2にはdimのキーがない（dimはiTerm2が計算する）
  const ansi = [
    r.ansiBW.black,
    r.ansiColor("red").normal,
    r.ansiColor("green").normal,
    r.ansiColor("yellow").normal,
    r.ansiColor("blue").normal,
    r.ansiColor("magenta").normal,
    r.ansiColor("cyan").normal,
    r.ansiBW.white,
    r.ansiBW.brightBlack,
    r.ansiColor("red").bright,
    r.ansiColor("green").bright,
    r.ansiColor("yellow").bright,
    r.ansiColor("blue").bright,
    r.ansiColor("magenta").bright,
    r.ansiColor("cyan").bright,
    r.ansiBW.brightWhite,
  ];

  return {
    ...Object.fromEntries(ansi.map((c, n) => [`Ansi ${n} Color`, c])),
    "Background Color": r.editorBg,
    "Foreground Color": t.fg,
    // 太字の文字。プロファイルの「Use Bright Bold」（既定でオン）のときに使われる
    "Bold Color": t.brightFg,
    // カーソルはZed版・VS Code版と同じアクセントの色。ブロックカーソルの下の文字はエディタの背景の色で抜く
    "Cursor Color": i.accent,
    "Cursor Text Color": r.editorBg,
    // カーソルのある行の帯（既定ではオフ）。エディタの現在行と同じ色
    "Cursor Guide Color": r.activeLine,
    // 選択範囲はVS Codeのterminal.selectionBackgroundと同じ色。選択中の文字は
    // プロファイルの「Use Selected Text Color」（既定でオン）のときにSelected Text Colorで描かれる
    "Selection Color": solid(tint(i.accent, 0.24)),
    "Selected Text Color": t.brightFg,
    // 検索の一致箇所。VS Codeのeditor.findMatchBackgroundと同じ色。
    // 上の文字は、iTerm2がこの色の明るさから白か黒を選んで描く（元の文字の色は使われない）
    "Match Background Color": solid(tint(i.number, 0.25)),
    "Link Color": r.ansiColor("cyan").normal,
    // バッジ（端末の右上に大きく出る文字）。iTerm2の既定と同じく半透明にする
    "Badge Color": withAlpha(i.accent, 0.5),
  };
};
