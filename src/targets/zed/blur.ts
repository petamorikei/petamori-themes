// 不透明版の規則から、ブラー（透過）版のテーマを組み立てる
//
// 方針: 色を乗せるのはウィンドウ全体の"background"だけにして、その上の層は透明にする
// （半透明を何層も重ねると濃さがまばらになるため）。パネルなどの階層は、低いアルファで重ねて出す。
import { alphaOf, over, withAlpha } from "../../engine/color.ts";
import type { Mode, Palette } from "../../engine/palette.ts";
import { buildStyle, type Style, type Theme } from "./theme.ts";

const CLEAR = "#00000000";

const transparentKeys = [
  "editor.background",
  "editor.gutter.background",
  "toolbar.background",
  "tab.active_background",
  "terminal.background",
  "scrollbar.track.background",
  "scrollbar.track.border",
  "tab.inactive_background",
  "scrollbar.thumb.border",
];
// タイトルバーとステータスバーは"background"を塗った領域の外側に描画される（Zedのworkspace.rsで別の要素）。
// そのためbackgroundの透け具合が効かない。色は各バー用のものを使い、不透明度だけbackgroundに合わせる。
const barKeys = ["title_bar.background", "title_bar.inactive_background", "status_bar.background"];
// 診断（エラー・警告など）のホバーの枠は、透過テーマだとZedが土台のelevated_surface.backgroundを透明にして、
// 重大度ごとの背景色だけで塗る（Zedのhover_popover.rsのDiagnosticPopover）。背景色は1割ほどの半透明なので、
// そのままでは下のコードが透けて読みにくい。不透明版で土台に重ねて見える色を合成し、ほかのポップアップと同じ不透明度にする。
// 同じキーはProject Diagnosticsの診断ブロックやボタンなどでも使われ、そちらも濃くなる（視認性を優先して受け入れた）
const diagnosticKeys = ["error", "warning", "info", "hint", "ignored"].map((k) => `${k}.background`);

const str = (style: Style, key: string): string => {
  const v = style[key];
  if (typeof v !== "string") throw new Error(`${key}が色ではない`);
  return v;
};

/** italic: 飾りのイタリックを使うか（Italic版）。色には影響しない */
export const buildBlurTheme = (palette: Palette, mode: Mode, name: string, italic = false): Theme => {
  const { opacity, overlay } = palette.blur;
  // 背景や枠線の色は文字の色に依存しないので、不透明版から取る
  const opaque = buildStyle(palette, mode);
  const editorBg = str(opaque, "editor.background");
  const background = withAlpha(editorBg, opacity);
  // 文字色の最低ラインは、半透明のbackgroundを黒い壁紙と白い壁紙に重ねた色の両方で確かめる。
  // その上に重なるハイライト・パネル・hover・バーなどの半透明の色も、両方の壁紙の上で確かめる
  const bases = [over(background, "#000000"), over(background, "#ffffff")];
  const overlayColors: [string, string][] = Object.entries(overlay[mode]).map(([k, [source, alpha]]) => [
    k,
    withAlpha(str(opaque, source), alpha),
  ]);
  // 現在行はコードの文字の下に常にある。ジャンプ先の行などの一時的なハイライトは、文字の色の計算に含めない
  const editorKeys = new Set(["editor.active_line.background"]);
  const transientKeys = new Set(["editor.highlighted_line.background"]);
  const editorOverlays = overlayColors.filter(([k]) => editorKeys.has(k)).map(([, c]) => c);
  const uiOverlays = [
    ...overlayColors.filter(([k]) => !editorKeys.has(k) && !transientKeys.has(k)).map(([, c]) => c),
    ...barKeys.map((k) => withAlpha(str(opaque, k), opacity)),
  ];
  const base = buildStyle(palette, mode, { bases, editorOverlays, uiOverlays, italic });
  const style: Style = { "background.appearance": "blurred", ...base, background };
  for (const k of transparentKeys) style[k] = CLEAR;
  for (const [k, [source, alpha]] of Object.entries(overlay[mode])) style[k] = withAlpha(str(base, source), alpha);
  for (const k of barKeys) style[k] = withAlpha(str(base, k), opacity);
  const elevated = str(base, "elevated_surface.background");
  const elevatedAlpha = alphaOf(str(style, "elevated_surface.background"));
  for (const k of diagnosticKeys) style[k] = withAlpha(over(str(base, k), elevated), elevatedAlpha);
  return { name, appearance: mode, style };
};
